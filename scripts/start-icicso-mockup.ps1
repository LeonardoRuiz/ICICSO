param(
    [switch] $NoBuild,
    [switch] $NoBrowser,
    [switch] $PrepareOnly,
    [switch] $RequireInfrastructure,
    [int] $EmulatorPort = 8090
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string] $Message)
    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
}

function Assert-Command {
    param([string] $Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontró el comando requerido: $Name"
    }
}

function Ensure-Directory {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Invoke-StepCommand {
    param(
        [string] $Label,
        [string[]] $Command
    )

    Write-Step $Label
    & $Command[0] @($Command[1..($Command.Length - 1)])
    if ($LASTEXITCODE -ne 0) {
        throw "Falló: $Label"
    }
}

function Stop-RecordedProcesses {
    param([string] $StateFile)

    if (-not (Test-Path -LiteralPath $StateFile)) {
        return
    }

    try {
        $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    }
    catch {
        Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
        return
    }

    if ($state.processes) {
        foreach ($processInfo in $state.processes) {
            if ($processInfo.pid) {
                try {
                    Stop-Process -Id ([int] $processInfo.pid) -Force -ErrorAction Stop
                }
                catch {
                    # ignore missing/already-stopped processes
                }
            }
        }
    }

    Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
}

function Get-PortOwner {
    param([int] $Port)

    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
        return $connection.OwningProcess
    }
    catch {
        return $null
    }
}

function Assert-PortFree {
    param(
        [int] $Port,
        [string] $Label
    )

    $owner = Get-PortOwner -Port $Port
    if ($owner) {
        $processName = ""
        try {
            $processName = (Get-Process -Id $owner -ErrorAction Stop).ProcessName
        }
        catch {
            $processName = "desconocido"
        }
        throw "El puerto $Port para $Label ya está en uso por PID $owner ($processName)."
    }
}

function Test-PortReachable {
    param([int] $Port)

    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $connected = $async.AsyncWaitHandle.WaitOne(1200, $false)
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

function Get-InfrastructureStatus {
    param(
        [string] $ComposeFilePath
    )

    $requirements = @(
        @{ Name = "PostgreSQL"; Port = 5432; Hint = "docker compose up -d postgres" },
        @{ Name = "Redis"; Port = 6379; Hint = "docker compose up -d redis" },
        @{ Name = "Kafka"; Port = 9092; Hint = "docker compose up -d zookeeper kafka" },
        @{ Name = "MinIO"; Port = 9000; Hint = "docker compose up -d minio" }
    )

    $missing = @()
    foreach ($requirement in $requirements) {
        if (-not (Test-PortReachable -Port $requirement.Port)) {
            $missing += $requirement
        }
    }

    $dockerAvailable = [bool](Get-Command docker -ErrorAction SilentlyContinue)
    return [pscustomobject]@{
        Missing = $missing
        DockerAvailable = $dockerAvailable
        ComposeAvailable = (Test-Path -LiteralPath $ComposeFilePath)
    }
}

function Start-LoggedProcess {
    param(
        [string] $Label,
        [string] $FilePath,
        [string[]] $ArgumentList,
        [string] $WorkingDirectory,
        [string] $StdOutPath,
        [string] $StdErrPath
    )

    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -PassThru `
        -WindowStyle Hidden `
        -RedirectStandardOutput $StdOutPath `
        -RedirectStandardError $StdErrPath

    return [pscustomobject]@{
        name = $Label
        pid = $process.Id
        stdout = $StdOutPath
        stderr = $StdErrPath
    }
}

function Wait-HttpOk {
    param(
        [string] $Label,
        [string] $Url,
        [int] $ProcessId,
        [string] $StdOutPath,
        [string] $StdErrPath,
        [int] $Attempts = 8,
        [int] $DelaySeconds = 1
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        if ($ProcessId) {
            try {
                Get-Process -Id $ProcessId -ErrorAction Stop | Out-Null
            }
            catch {
                throw "El proceso $Label (PID $ProcessId) terminó antes del healthcheck. Revisa: $StdOutPath y $StdErrPath"
            }
        }

        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                return
            }
        }
        catch {
            Start-Sleep -Seconds $DelaySeconds
            continue
        }
        Start-Sleep -Seconds $DelaySeconds
    }

    throw "Healthcheck falló para $Label ($Url)"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $repoRoot "icicso-local"
$emulatorRoot = Join-Path $localRoot "apps\desktop-emulator"
$composeFile = Join-Path $localRoot "docker-compose.yml"
$configEnvExamplePath = Join-Path $repoRoot "config\env\.env.local.example"
$configEnvPath = Join-Path $repoRoot "config\env\.env.local"
$envPath = Join-Path $localRoot ".env"
$configValidateScript = Join-Path $repoRoot "scripts\config-validate.ps1"
$logsRoot = Join-Path $repoRoot "logs\mockup"
$stateFile = Join-Path $logsRoot "runtime-state.json"

Ensure-Directory -Path $logsRoot

Write-Step "Validando herramientas base"
Assert-Command -Name "node"
Assert-Command -Name "pnpm"
Assert-Command -Name "py"

Write-Host ("node  {0}" -f ((node -v) | Select-Object -First 1))
Write-Host ("pnpm  {0}" -f ((pnpm -v) | Select-Object -First 1))
Write-Host ("python {0}" -f ((py -V) | Select-Object -First 1))

if (-not (Test-Path -LiteralPath $configEnvPath)) {
    if (-not (Test-Path -LiteralPath $configEnvExamplePath)) {
        throw "Falta $configEnvExamplePath"
    }

    Copy-Item -LiteralPath $configEnvExamplePath -Destination $configEnvPath
    Write-Host ".env.local creado a partir de config/env/.env.local.example" -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath $configValidateScript)) {
    throw "Falta $configValidateScript"
}

Write-Step "Sincronizando configuración local"
& powershell -NoProfile -ExecutionPolicy Bypass -File $configValidateScript -Environment local -Sync -AllowPlaceholders
if ($LASTEXITCODE -ne 0) {
    throw "Falló la sincronización de configuración local"
}

if (-not (Test-Path -LiteralPath $envPath)) {
    throw "No se generó $envPath después de sincronizar config/env/.env.local"
}

Write-Step "Preparando dependencias de icicso-local"
Set-Location $localRoot
if (-not (Test-Path -LiteralPath (Join-Path $localRoot "node_modules"))) {
    & pnpm install
    if ($LASTEXITCODE -ne 0) {
        throw "pnpm install falló en icicso-local"
    }
}
else {
    Write-Host "node_modules ya existe; se reutiliza." -ForegroundColor Green
}

$packageBuilds = @(
    "@icicso/canonical-types",
    "@icicso/config",
    "@icicso/contracts",
    "@icicso/logger",
    "@icicso/database"
)

$serviceBuilds = @(
    "@icicso/auth-service",
    "@icicso/identity-service",
    "@icicso/audit-service",
    "@icicso/storage-service",
    "@icicso/ingestion-service",
    "@icicso/terminology-service",
    "@icicso/data-governance-service",
    "@icicso/evidence-lake-service",
    "@icicso/ghl-service",
    "@icicso/kbol-service",
    "@icicso/runbook-service",
    "@icicso/readiness-service",
    "@icicso/case-control-service",
    "@icicso/systemic-risk-service",
    "@icicso/cqoi-service",
    "@icicso/gateway-api"
)

if (-not $NoBuild) {
    Write-Step "Compilando paquetes base"
    foreach ($packageName in $packageBuilds) {
        & pnpm --filter $packageName build
        if ($LASTEXITCODE -ne 0) {
            throw "Falló el build de $packageName"
        }
    }

    Write-Step "Compilando servicios del mockup integral"
    foreach ($serviceName in $serviceBuilds) {
        & pnpm --filter $serviceName build
        if ($LASTEXITCODE -ne 0) {
            throw "Falló el build de $serviceName"
        }
    }
}
else {
    Write-Host "Se omite build por -NoBuild" -ForegroundColor Yellow
}

if ($PrepareOnly) {
    Write-Step "Preparación completada"
    Write-Host "Build y validación listos en $localRoot" -ForegroundColor Green
    exit 0
}

Write-Step "Validando infraestructura local"
$infraStatus = Get-InfrastructureStatus -ComposeFilePath $composeFile
if ($infraStatus.Missing.Count -eq 0) {
    Write-Host "Infraestructura externa detectada." -ForegroundColor Green
}
else {
    $summary = ($infraStatus.Missing | ForEach-Object { "{0}:{1}" -f $_.Name, $_.Port }) -join ", "
    Write-Host "Infraestructura no disponible: $summary" -ForegroundColor Yellow

    if ($infraStatus.DockerAvailable -and $infraStatus.ComposeAvailable) {
        Write-Host "Sugerencia: cd .\icicso-local && docker compose up -d" -ForegroundColor Yellow
    }
    elseif (-not $infraStatus.DockerAvailable) {
        Write-Host "Docker no esta disponible en PATH; el mockup seguira solo con componentes que no dependan de esa infraestructura." -ForegroundColor Yellow
    }

    if ($RequireInfrastructure) {
        throw "No se puede continuar porque -RequireInfrastructure exige dependencias externas disponibles."
    }
}

Stop-RecordedProcesses -StateFile $stateFile

$serviceProcesses = @(
    @{ Name = "auth-service"; Port = 3101; Script = "apps/auth-service/dist/index.js"; Health = "http://127.0.0.1:3101/health" },
    @{ Name = "identity-service"; Port = 3102; Script = "apps/identity-service/dist/index.js"; Health = "http://127.0.0.1:3102/health" },
    @{ Name = "audit-service"; Port = 3103; Script = "apps/audit-service/dist/index.js"; Health = "http://127.0.0.1:3103/health" },
    @{ Name = "evidence-lake-service"; Port = 3104; Script = "apps/evidence-lake-service/dist/index.js"; Health = "http://127.0.0.1:3104/health" },
    @{ Name = "ghl-service"; Port = 3105; Script = "apps/ghl-service/dist/index.js"; Health = "http://127.0.0.1:3105/health" },
    @{ Name = "kbol-service"; Port = 3106; Script = "apps/kbol-service/dist/index.js"; Health = "http://127.0.0.1:3106/health" },
    @{ Name = "storage-service"; Port = 3107; Script = "apps/storage-service/dist/index.js"; Health = "http://127.0.0.1:3107/health" },
    @{ Name = "ingestion-service"; Port = 3108; Script = "apps/ingestion-service/dist/index.js"; Health = "http://127.0.0.1:3108/health/live" },
    @{ Name = "terminology-service"; Port = 3109; Script = "apps/terminology-service/dist/index.js"; Health = "http://127.0.0.1:3109/health" },
    @{ Name = "data-governance-service"; Port = 3110; Script = "apps/data-governance-service/dist/index.js"; Health = "http://127.0.0.1:3110/health" },
    @{ Name = "runbook-service"; Port = 3111; Script = "apps/runbook-service/dist/index.js"; Health = "http://127.0.0.1:3111/health" },
    @{ Name = "readiness-service"; Port = 3112; Script = "apps/readiness-service/dist/index.js"; Health = "http://127.0.0.1:3112/health" },
    @{ Name = "case-control-service"; Port = 3113; Script = "apps/case-control-service/dist/index.js"; Health = "http://127.0.0.1:3113/health" },
    @{ Name = "systemic-risk-service"; Port = 3114; Script = "apps/systemic-risk-service/dist/index.js"; Health = "http://127.0.0.1:3114/health" },
    @{ Name = "cqoi-service"; Port = 3115; Script = "apps/cqoi-service/dist/index.js"; Health = "http://127.0.0.1:3115/health" },
    @{ Name = "gateway-api"; Port = 3100; Script = "apps/gateway-api/dist/index.js"; Health = "http://127.0.0.1:3100/health/live" }
)

foreach ($service in $serviceProcesses) {
    Assert-PortFree -Port $service.Port -Label $service.Name
}
Assert-PortFree -Port $EmulatorPort -Label "desktop-emulator"

Write-Step "Levantando servicios HTTP"
$startedProcesses = @()
foreach ($service in $serviceProcesses) {
    $stdout = Join-Path $logsRoot "$($service.Name).out.log"
    $stderr = Join-Path $logsRoot "$($service.Name).err.log"
    $startedProcesses += Start-LoggedProcess `
        -Label $service.Name `
        -FilePath "node" `
        -ArgumentList @($service.Script) `
        -WorkingDirectory $localRoot `
        -StdOutPath $stdout `
        -StdErrPath $stderr
}

$emulatorProcess = Start-LoggedProcess `
    -Label "desktop-emulator" `
    -FilePath "py" `
    -ArgumentList @("-m", "http.server", $EmulatorPort.ToString()) `
    -WorkingDirectory $emulatorRoot `
    -StdOutPath (Join-Path $logsRoot "desktop-emulator.out.log") `
    -StdErrPath (Join-Path $logsRoot "desktop-emulator.err.log")

$runtimeState = [pscustomobject]@{
    startedAt = (Get-Date).ToString("o")
    processes = @($startedProcesses + $emulatorProcess)
    urls = [pscustomobject]@{
        gateway = "http://127.0.0.1:3100"
        emulator = "http://127.0.0.1:$EmulatorPort/index.html"
    }
}
$runtimeState | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $stateFile -Encoding UTF8

Write-Step "Esperando healthchecks"
try {
    foreach ($service in $serviceProcesses) {
        $processRecord = $startedProcesses | Where-Object { $_.name -eq $service.Name } | Select-Object -First 1
        Wait-HttpOk `
            -Label $service.Name `
            -Url $service.Health `
            -ProcessId $processRecord.pid `
            -StdOutPath $processRecord.stdout `
            -StdErrPath $processRecord.stderr
    }

    Wait-HttpOk `
        -Label "desktop-emulator" `
        -Url "http://127.0.0.1:$EmulatorPort/index.html" `
        -ProcessId $emulatorProcess.pid `
        -StdOutPath $emulatorProcess.stdout `
        -StdErrPath $emulatorProcess.stderr
}
catch {
    Stop-RecordedProcesses -StateFile $stateFile
    throw
}

Write-Step "ICICSO mockup operativo"
Write-Host "Gateway         http://127.0.0.1:3100" -ForegroundColor Green
Write-Host "Emulador HTML   http://127.0.0.1:$EmulatorPort/index.html" -ForegroundColor Green
Write-Host "Estado runtime  $stateFile" -ForegroundColor Green
Write-Host "Logs            $logsRoot" -ForegroundColor Green
Write-Host ""
Write-Host "Health principales:" -ForegroundColor Cyan
foreach ($service in $serviceProcesses) {
    Write-Host ("- {0} -> {1}" -f $service.Name, $service.Health)
}

if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:$EmulatorPort/index.html" | Out-Null
}
