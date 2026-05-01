[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$arguments = @((Join-Path $repoRoot "scripts\aws_staging_tools.py"), "destroy")
if ($Force) {
    $arguments += "--force"
}
& python @arguments
exit $LASTEXITCODE
