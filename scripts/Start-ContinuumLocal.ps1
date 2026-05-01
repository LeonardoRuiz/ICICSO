param(
    [switch] $NoBuild,
    [switch] $NoBrowser
)

& (Join-Path $PSScriptRoot "start-icicso-mockup.ps1") @PSBoundParameters
