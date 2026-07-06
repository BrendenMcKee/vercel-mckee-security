# Fallback migration applier: pushes a local migration file through the
# Supabase Management API when the CLI's pooler login is unavailable, then
# records it in supabase_migrations.schema_migrations so `db push` stays in
# sync. Usage: powershell -File scripts/apply-migration-api.ps1 <path-to-sql>
$ErrorActionPreference = "Stop"

$file = $args[0]
if (-not $file -or -not (Test-Path $file)) { throw "Pass the migration .sql path." }
$name = [System.IO.Path]::GetFileNameWithoutExtension($file)
$version = ($name -split "_")[0]
$sql = Get-Content $file -Raw

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

$uri = "https://api.supabase.com/v1/projects/cxmydfhbclfwzboqibmo/database/query"
$headers = @{ Authorization = "Bearer $token" }

# 1. Apply the migration body.
$null = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json" `
    -Body (@{ query = $sql } | ConvertTo-Json -Depth 4)
"applied: $name"

# 2. Record it in migration history (mirrors db push bookkeeping).
$record = @"
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('$version', '$($name.Substring($version.Length + 1))', array[]::text[])
on conflict (version) do nothing;
"@
$null = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json" `
    -Body (@{ query = $record } | ConvertTo-Json -Depth 4)
"recorded in schema_migrations: $version"
