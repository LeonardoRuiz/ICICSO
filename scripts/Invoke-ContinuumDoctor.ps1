$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path $repoRoot "logs\mockup\runtime-state.json"
$composeFile = Join-Path $repoRoot "icicso-local\docker-compose.yml"

function Get-RuntimeStateStatus {
    param([string] $Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return [pscustomobject]@{
            Exists = $false
            ActiveProcesses = 0
            Stale = $false
        }
    }

    try {
        $state = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    }
    catch {
        return [pscustomobject]@{
            Exists = $true
            ActiveProcesses = 0
            Stale = $true
        }
    }

    $activeProcesses = 0
    foreach ($processInfo in $state.processes) {
        if ($processInfo.pid) {
            try {
                Get-Process -Id ([int] $processInfo.pid) -ErrorAction Stop | Out-Null
                $activeProcesses += 1
            }
            catch {
                # ignore dead processes
            }
        }
    }

    return [pscustomobject]@{
        Exists = $true
        ActiveProcesses = $activeProcesses
        Stale = ($activeProcesses -eq 0)
    }
}

function Test-PortReachable {
    param([int] $Port)

    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $connected = $async.AsyncWaitHandle.WaitOne(900, $false)
        if (-not $connected) {
            $client.Close()
            return $false
        }

        $client.EndConnect($async)
        $client.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Test-HttpReachable {
    param([string] $Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    }
    catch {
        return $false
    }
}

$checks = @(
    @{ Name = "gateway"; Url = "http://127.0.0.1:3100/health/live"; Mode = "live"; ReadyUrl = "http://127.0.0.1:3100/health" },
    @{ Name = "auth"; Url = "http://127.0.0.1:3101/health" },
    @{ Name = "identity"; Url = "http://127.0.0.1:3102/health" },
    @{ Name = "audit"; Url = "http://127.0.0.1:3103/health" },
    @{ Name = "storage"; Url = "http://127.0.0.1:3107/health" },
    @{ Name = "ingestion"; Url = "http://127.0.0.1:3108/health/live"; Mode = "live"; ReadyUrl = "http://127.0.0.1:3108/health" },
    @{ Name = "terminology"; Url = "http://127.0.0.1:3109/health" },
    @{ Name = "governance"; Url = "http://127.0.0.1:3110/health" },
    @{ Name = "evidence-lake"; Url = "http://127.0.0.1:3104/health" },
    @{ Name = "ghl"; Url = "http://127.0.0.1:3105/health" },
    @{ Name = "kbol"; Url = "http://127.0.0.1:3106/health" },
    @{ Name = "runbook"; Url = "http://127.0.0.1:3111/health" },
    @{ Name = "readiness"; Url = "http://127.0.0.1:3112/health" },
    @{ Name = "case-control"; Url = "http://127.0.0.1:3113/health" },
    @{ Name = "systemic-risk"; Url = "http://127.0.0.1:3114/health" },
    @{ Name = "cqoi"; Url = "http://127.0.0.1:3115/health" },
    @{ Name = "emulator"; Url = "http://127.0.0.1:8090/index.html" }
)

$infraChecks = @(
    @{ Name = "postgres"; Port = 5432 },
    @{ Name = "redis"; Port = 6379 },
    @{ Name = "kafka"; Port = 9092 },
    @{ Name = "minio"; Port = 9000 }
)

Write-Host ""
Write-Host "ICICSO Mockup Doctor" -ForegroundColor Cyan
Write-Host "Repo root: $repoRoot"
Write-Host ""

$runtimeState = Get-RuntimeStateStatus -Path $stateFile
if ($runtimeState.Exists -and -not $runtimeState.Stale) {
    Write-Host "runtime-state: $stateFile ($($runtimeState.ActiveProcesses) procesos activos)" -ForegroundColor Green
}
elseif ($runtimeState.Exists) {
    Write-Host "runtime-state: stale ($stateFile, sin procesos vivos)" -ForegroundColor Yellow
}
else {
    Write-Host "runtime-state: no encontrado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Infraestructura local:" -ForegroundColor Cyan
foreach ($infra in $infraChecks) {
    if (Test-PortReachable -Port $infra.Port) {
        Write-Host ("[OK] {0} -> 127.0.0.1:{1}" -f $infra.Name, $infra.Port) -ForegroundColor Green
    }
    else {
        Write-Host ("[DOWN] {0} -> 127.0.0.1:{1}" -f $infra.Name, $infra.Port) -ForegroundColor Yellow
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "docker: no disponible en PATH" -ForegroundColor Yellow
}
elseif (Test-Path -LiteralPath $composeFile) {
    Write-Host "docker compose: disponible" -ForegroundColor Green
}

Write-Host ""
Write-Host "Servicios ICICSO:" -ForegroundColor Cyan
foreach ($check in $checks) {
    if (Test-HttpReachable -Url $check.Url) {
        if ($check.ReadyUrl) {
            if (Test-HttpReachable -Url $check.ReadyUrl) {
                Write-Host ("[READY] {0} -> {1}" -f $check.Name, $check.ReadyUrl) -ForegroundColor Green
            }
            else {
                Write-Host ("[LIVE] {0} -> {1} (ready degradado: {2})" -f $check.Name, $check.Url, $check.ReadyUrl) -ForegroundColor Yellow
            }
        }
        else {
            Write-Host ("[OK] {0} -> {1}" -f $check.Name, $check.Url) -ForegroundColor Green
        }
    }
    else {
        Write-Host ("[DOWN] {0} -> {1}" -f $check.Name, $check.Url) -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Arranque oficial:" -ForegroundColor Cyan
Write-Host ".\scripts\start-icicso-mockup.bat"
if (Test-Path -LiteralPath $composeFile) {
    Write-Host "Si la infraestructura esta caida: cd .\icicso-local && docker compose up -d" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Detencion oficial:" -ForegroundColor Cyan
Write-Host ".\scripts\stop-icicso-mockup.ps1"
