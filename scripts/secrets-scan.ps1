[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
python (Join-Path $repoRoot "scripts\config_tools.py") secret-scan
exit $LASTEXITCODE
