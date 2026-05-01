param(
    [switch] $NoBuild,
    [switch] $NoBrowser,
    [int] $EmulatorPort = 8090
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string] $Message)
    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $repoRoot "icicso-local"
$composeFile = Join-Path $localRoot "docker-compose.yml"

Write-Step "Arranque ICICSO Local completo"

if (-not (Test-Path -LiteralPath $composeFile)) {
    throw "No se encontró $composeFile"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker no está disponible en PATH."
}

Write-Step "Levantando infraestructura (postgres, redis, kafka, minio)"
Set-Location $localRoot
docker compose up -d postgres redis zookeeper kafka minio
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up -d falló"
}

Write-Step "Arrancando runtime ICICSO Local"
Set-Location $repoRoot
& powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-icicso-mockup.ps1 `
    @(
        $(if ($NoBuild) { "-NoBuild" } else { $null }),
        $(if ($NoBrowser) { "-NoBrowser" } else { $null }),
        "-RequireInfrastructure",
        "-EmulatorPort",
        $EmulatorPort
    ) | Where-Object { $_ }

if ($LASTEXITCODE -ne 0) {
    throw "start-icicso-mockup.ps1 falló"
}
