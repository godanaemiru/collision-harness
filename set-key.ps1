$ErrorActionPreference = 'Stop'
$taskKeyPath = Join-Path $PSScriptRoot '.env'
$taskSecureKey = Read-Host 'Enter your OpenRouter API key (hidden)' -AsSecureString
$taskKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecureKey)
try {
    $taskPlainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskKeyPointer)
    if ($taskPlainKey -notmatch '^sk-or-[A-Za-z0-9_-]+$') { throw 'That does not look like an OpenRouter API key.' }
    [IO.File]::WriteAllText($taskKeyPath, "OPENROUTER_API_KEY=$taskPlainKey`n", [Text.UTF8Encoding]::new($false))
    Write-Host 'Key saved locally in the ignored .env file. Do not share that file.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskKeyPointer)
    $taskPlainKey = $null
}
