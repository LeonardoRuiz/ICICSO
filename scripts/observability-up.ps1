[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$namespace = "icicso-local"
$stateDir = Join-Path $PSScriptRoot ".observability"
$logDir = Join-Path $repoRoot "logs\observability"
$composeFile = Join-Path $repoRoot "infra\observability\docker-compose.yml"
$composeEnvFile = Join-Path $repoRoot "infra\observability\.env"
$configValidateScript = Join-Path $repoRoot "scripts\config-validate.ps1"

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "No se encontro el comando requerido: $name"
  }
}

function Assert-DockerDesktop {
  docker info | Out-Null
}

function Assert-Kubernetes {
  $context = kubectl config current-context
  if ($context.Trim() -ne "docker-desktop") {
    throw "El contexto actual de kubectl es '$context'. Se esperaba 'docker-desktop'."
  }
  kubectl cluster-info | Out-Null
}

function Ensure-Directories {
  New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}

function Start-BackgroundCommand($name, $command) {
  $stdout = Join-Path $logDir "$name.out.log"
  $stderr = Join-Path $logDir "$name.err.log"
  $process = Start-Process -FilePath "pwsh" -ArgumentList "-NoProfile", "-Command", $command -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  Set-Content -Path (Join-Path $stateDir "$name.pid") -Value $process.Id
}

function Wait-HttpOk($url, $attempts = 30) {
  for ($i = 0; $i -lt $attempts; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "El endpoint no quedo listo: $url"
}

Assert-Command docker
Assert-Command kubectl
Assert-DockerDesktop
Assert-Kubernetes
Ensure-Directories

& $configValidateScript -Environment local -Sync
if ($LASTEXITCODE -ne 0) {
  throw "La validacion/sincronizacion de configuracion local fallo."
}

$requiredServices = @("icicso-frontend", "icicso-api", "icicso-parser", "icicso-engine", "icicso-postgres", "icicso-redis")
foreach ($service in $requiredServices) {
  kubectl get service $service -n $namespace | Out-Null
}

docker compose --env-file $composeEnvFile -f $composeFile down --remove-orphans | Out-Null

Start-BackgroundCommand "pf-frontend" "kubectl port-forward -n $namespace svc/icicso-frontend 18080:80"
Start-BackgroundCommand "pf-api" "kubectl port-forward -n $namespace svc/icicso-api 13100:3100"
Start-BackgroundCommand "pf-parser" "kubectl port-forward -n $namespace svc/icicso-parser 13108:3108"
Start-BackgroundCommand "pf-engine" "kubectl port-forward -n $namespace svc/icicso-engine 18000:8000"
Start-BackgroundCommand "pf-postgres" "kubectl port-forward -n $namespace svc/icicso-postgres 15432:5432"
Start-BackgroundCommand "pf-redis" "kubectl port-forward -n $namespace svc/icicso-redis 16379:6379"

Start-BackgroundCommand "logs-frontend" "kubectl logs -n $namespace deploy/icicso-frontend -f --all-containers=true"
Start-BackgroundCommand "logs-api" "kubectl logs -n $namespace deploy/icicso-api -f --all-containers=true"
Start-BackgroundCommand "logs-parser" "kubectl logs -n $namespace deploy/icicso-parser -f --all-containers=true"
Start-BackgroundCommand "logs-engine" "kubectl logs -n $namespace deploy/icicso-engine -f --all-containers=true"
Start-BackgroundCommand "logs-postgres" "kubectl logs -n $namespace deploy/icicso-postgres -f"
Start-BackgroundCommand "logs-redis" "kubectl logs -n $namespace deploy/icicso-redis -f"

Start-Sleep -Seconds 5
docker compose --env-file $composeEnvFile -f $composeFile up -d

Wait-HttpOk "http://localhost:18080/health/ready"
Wait-HttpOk "http://localhost:13100/health/ready"
Wait-HttpOk "http://localhost:13108/health/ready"
Wait-HttpOk "http://localhost:18000/health/ready"
Wait-HttpOk "http://localhost:9091/-/ready"
Wait-HttpOk "http://localhost:3300/api/health"

Write-Host ""
Write-Host "Observabilidad ICICSO lista."
Write-Host "Grafana:    http://localhost:3300  (credenciales desde config/env/.env.local)"
Write-Host "Prometheus: http://localhost:9091"
Write-Host "Loki:       http://localhost:3310"
Write-Host "Tempo:      http://localhost:3320"
Write-Host ""
Write-Host "Targets puente:"
Write-Host "frontend -> http://localhost:18080"
Write-Host "api      -> http://localhost:13100"
Write-Host "parser   -> http://localhost:13108"
Write-Host "engine   -> http://localhost:18000"
