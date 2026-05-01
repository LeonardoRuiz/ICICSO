param(
    [int] $Port = 8090
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$emulatorRoot = Join-Path $repoRoot "icicso-local\apps\desktop-emulator"

Set-Location $emulatorRoot
Write-Host "ICICSO emulator live on http://127.0.0.1:$Port/index.html" -ForegroundColor Green
py -m http.server $Port
