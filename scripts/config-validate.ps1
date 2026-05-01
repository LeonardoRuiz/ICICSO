[CmdletBinding()]
param(
  [ValidateSet("local", "dev", "staging", "prod")]
  [string]$Environment = "local",
  [switch]$Sync,
  [switch]$AllowPlaceholders
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot "scripts\config_tools.py"

$arguments = @($scriptPath, "validate", "--environment", $Environment)
if ($Sync) { $arguments += "--sync" }
if ($AllowPlaceholders) { $arguments += "--allow-placeholders" }

python @arguments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
