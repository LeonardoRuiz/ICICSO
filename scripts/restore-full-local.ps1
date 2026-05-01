[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$arguments = @((Join-Path $repoRoot "scripts\storage_tools.py"), "restore-full", "--input", $InputPath)
if ($Force) {
    $arguments += "--force"
}
& python @arguments
exit $LASTEXITCODE
