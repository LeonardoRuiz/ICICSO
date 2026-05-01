param(
    [string]$TaskName = "ICICSO-Terminology-Sync",
    [int]$RepeatMinutes = 360,
    [int]$Cycles = 3,
    [int]$SleepSeconds = 30,
    [switch]$NonInteractive = $true,
    [string[]]$Dataset
)

$ErrorActionPreference = "Stop"

if ($RepeatMinutes -lt 1) {
    throw "RepeatMinutes debe ser >= 1."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot "scripts\start-terminology-sync.ps1"
$pwshPath = (Get-Command powershell.exe).Source

$datasetArgs = @()
foreach ($item in $Dataset) {
    foreach ($normalized in ($item -split ",")) {
        $trimmed = $normalized.Trim()
        if ($trimmed) {
            $datasetArgs += "-Dataset `"$trimmed`""
        }
    }
}

$nonInteractiveArg = if ($NonInteractive) { "-NonInteractive" } else { "" }
$argumentString = @(
    "-ExecutionPolicy Bypass"
    "-File `"$scriptPath`""
    "-Cycles $Cycles"
    "-SleepSeconds $SleepSeconds"
    $nonInteractiveArg
    $datasetArgs
) -join " "

$action = New-ScheduledTaskAction -Execute $pwshPath -Argument $argumentString
$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes $RepeatMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Runs ICICSO terminology sync on a recurring schedule." `
    -Force | Out-Null

Write-Output "registered=$TaskName"
Write-Output "repeat_minutes=$RepeatMinutes"
Write-Output "command=$pwshPath $argumentString"
