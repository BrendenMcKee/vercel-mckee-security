# Point Supabase Auth's mailer at Resend SMTP so recovery / confirmation
# emails are branded and not capped at 2/hour. Secrets are read from local
# files / Credential Manager and never printed.
#
# RESEND_API_KEY is stored as a *sensitive* var in Vercel (not pullable), so
# a human must place it in website/.env.local first:
#   RESEND_API_KEY=re_...
# then run: powershell -File scripts/configure-auth-smtp.ps1
$ErrorActionPreference = "Stop"

$resendKey = $null
foreach ($file in @("$PSScriptRoot\..\.env.local", "$PSScriptRoot\..\.env.production.local")) {
    if (-not (Test-Path $file)) { continue }
    $envLine = Get-Content $file | Where-Object { $_ -match '^RESEND_API_KEY=' } | Select-Object -First 1
    if ($envLine) {
        $candidate = ($envLine -replace '^RESEND_API_KEY=', '').Trim('"')
        if ($candidate.Length -gt 0) { $resendKey = $candidate; break }
    }
}
if (-not $resendKey) {
    throw "RESEND_API_KEY not found (add it to website/.env.local; the Vercel copy is sensitive and cannot be pulled)."
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class CredMan {
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredRead(string target, uint type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll")]
    private static extern void CredFree(IntPtr cred);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct CREDENTIAL {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static string GetSecret(string target) {
        IntPtr ptr;
        if (!CredRead(target, 1, 0, out ptr)) return null;
        try {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(ptr, typeof(CREDENTIAL));
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, (int)cred.CredentialBlobSize);
            return Encoding.UTF8.GetString(bytes);
        } finally {
            CredFree(ptr);
        }
    }
}
"@

$token = [CredMan]::GetSecret("Supabase CLI:supabase")
if (-not $token) { throw "Supabase CLI credential not found" }

$body = @{
    smtp_admin_email          = "info@mckeesecurity.ca"
    smtp_host                 = "smtp.resend.com"
    smtp_port                 = "465"
    smtp_user                 = "resend"
    smtp_pass                 = $resendKey
    smtp_sender_name          = "McKee Security"
    rate_limit_email_sent     = 30
    mailer_subjects_recovery  = "Reset your McKee Security portal password"
    mailer_subjects_confirmation = "Confirm your McKee Security portal email"
} | ConvertTo-Json

$resp = Invoke-RestMethod -Method Patch `
    -Uri "https://api.supabase.com/v1/projects/cxmydfhbclfwzboqibmo/config/auth" `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body $body

[PSCustomObject]@{
    smtp_host             = $resp.smtp_host
    smtp_port             = $resp.smtp_port
    smtp_user             = $resp.smtp_user
    smtp_admin_email      = $resp.smtp_admin_email
    smtp_sender_name      = $resp.smtp_sender_name
    smtp_pass_set         = [bool]$resp.smtp_pass
    rate_limit_email_sent = $resp.rate_limit_email_sent
    recovery_subject      = $resp.mailer_subjects_recovery
} | Format-List
