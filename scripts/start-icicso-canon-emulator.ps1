param(
    [int] $Port = 8098
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$emulatorRoot = Join-Path $repoRoot "icicso\apps\emulator"
$url = "http://127.0.0.1:$Port/index.html"

function Test-UrlReady {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -ge 200
    }
    catch {
        return $false
    }
}

Write-Host "ICICSO Canon Emulator" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host "Emulator root: $emulatorRoot"
Write-Host ""

if (-not (Test-Path -LiteralPath $emulatorRoot)) {
    throw "No se encontró el emulador canónico en $emulatorRoot"
}

if (-not (Test-UrlReady -Url $url)) {
    Write-Host "Levantando servidor HTTP local para el emulador canónico..."
    Start-Process -FilePath py -WorkingDirectory $emulatorRoot -ArgumentList @(
        "-m",
        "http.server",
        $Port
    ) | Out-Null

    $ready = $false
    foreach ($attempt in 1..15) {
        Start-Sleep -Seconds 1
        if (Test-UrlReady -Url $url) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        Write-Host ""
        Write-Host "El emulador canónico no respondió a tiempo en $url" -ForegroundColor Yellow
        Write-Host "Revisa si Python está disponible o si el puerto $Port está ocupado."
        Read-Host "Presiona Enter para salir"
        exit 1
    }
}

Write-Host "Abriendo emulador canónico en el navegador..."
try {
    Start-Process explorer.exe $url | Out-Null
}
catch {
    Write-Host "No se pudo abrir el navegador automáticamente. Abre manualmente: $url" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Si el navegador no se abrió, entra manualmente a: $url"
Read-Host "Presiona Enter para cerrar esta ventana"
