# Fetch Supabase security/performance advisors via the Management API
# (fallback when MCP is unavailable). Usage: get-advisors-api.ps1 [security|performance]
$ErrorActionPreference = "Stop"
$type = if ($args[0]) { $args[0] } else { "security" }

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class CredMan2 {
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

$token = [CredMan2]::GetSecret("Supabase CLI:supabase")
if (-not $token) { throw "Supabase CLI credential not found" }

$resp = Invoke-RestMethod -Method Get `
    -Uri "https://api.supabase.com/v1/projects/cxmydfhbclfwzboqibmo/advisors/$type" `
    -Headers @{ Authorization = "Bearer $token" }

if (-not $resp.lints -or $resp.lints.Count -eq 0) {
    "No $type advisories."
} else {
    $resp.lints | ForEach-Object {
        [PSCustomObject]@{ level = $_.level; name = $_.name; detail = $_.detail }
    } | Format-List
}
