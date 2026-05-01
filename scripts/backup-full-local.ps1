[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
& python (Join-Path $repoRoot "scripts\storage_tools.py") backup-full
exit $LASTEXITCODE
