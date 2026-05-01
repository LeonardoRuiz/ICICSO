[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
& python (Join-Path $repoRoot "scripts\aws_staging_tools.py") deploy
exit $LASTEXITCODE
