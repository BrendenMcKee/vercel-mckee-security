# Run a SQL string (arg 0) or file (arg 0 with -File flag semantics: pass a
# path that exists) against production via the Supabase Management API.
# Prints the JSON result. Token comes from the CLI's Credential Manager entry.
$ErrorActionPreference = "Stop"

$input0 = $args[0]
if (-not $input0) { throw "Pass SQL text or a .sql file path." }
$isFile = $input0.Length -lt 200 -and $input0 -match '\.sql$' -and (Test-Path $input0)
$sql = if ($isFile) { Get-Content $input0 -Raw } else { $input0 }

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

$resp = Invoke-RestMethod -Method Post `
    -Uri "https://api.supabase.com/v1/projects/cxmydfhbclfwzboqibmo/database/query" `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body (@{ query = $sql } | ConvertTo-Json -Depth 4)

$resp | ConvertTo-Json -Depth 6
