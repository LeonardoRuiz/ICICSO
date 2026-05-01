[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-Step([string]$PathToScript) {
    & $PathToScript
    if ($LASTEXITCODE -ne 0) {
        throw "Script falló: $PathToScript"
    }
}

Invoke-Step (Join-Path $repoRoot "scripts\k8s-up.ps1")
Invoke-Step (Join-Path $repoRoot "scripts\smoke-test.ps1")
