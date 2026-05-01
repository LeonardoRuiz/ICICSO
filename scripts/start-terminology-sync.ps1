param(
    [int]$Cycles = 3,
    [int]$SleepSeconds = 30,
    [switch]$NonInteractive = $true,
    [string[]]$Dataset,
    [switch]$LoopForever
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $repoRoot "ICICSO_TERMINOLOGIAS\05_SERVICES\terminology_downloader\run_all.py"
$logDir = Join-Path $repoRoot "logs"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$sessionLog = Join-Path $logDir "terminology_sync_$timestamp.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Invoke-TerminologySync {
    $arguments = @($runner, "--cycles", $Cycles, "--sleep-seconds", $SleepSeconds)
    if ($NonInteractive) {
        $arguments += "--non-interactive"
    }
    foreach ($item in $Dataset) {
        foreach ($normalized in ($item -split ",")) {
            $trimmed = $normalized.Trim()
            if ($trimmed) {
                $arguments += @("--dataset", $trimmed)
            }
        }
    }

    "[$((Get-Date).ToString('s'))] Running terminology sync..." | Tee-Object -FilePath $sessionLog -Append
    & py @arguments 2>&1 | Tee-Object -FilePath $sessionLog -Append
    $exitCode = $LASTEXITCODE
    "[$((Get-Date).ToString('s'))] ExitCode=$exitCode" | Tee-Object -FilePath $sessionLog -Append
    return $exitCode
}

if ($LoopForever) {
    while ($true) {
        Invoke-TerminologySync | Out-Null
        Start-Sleep -Seconds $SleepSeconds
    }
}
else {
    exit (Invoke-TerminologySync)
}
