param(
    [switch] $NoBuild
)

& (Join-Path $PSScriptRoot "start-icicso-mockup.ps1") -PrepareOnly @PSBoundParameters
