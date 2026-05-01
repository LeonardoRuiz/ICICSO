[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $PSScriptRoot ".observability"
$composeFile = Join-Path $repoRoot "infra\observability\docker-compose.yml"
$composeEnvFile = Join-Path $repoRoot "infra\observability\.env"
$namespace = "icicso-local"

Write-Host "Contexto kubectl: $(kubectl config current-context)"
Write-Host ""
Write-Host "Servicios Kubernetes:"
kubectl get pods,svc,ingress -n $namespace
Write-Host ""
Write-Host "Stack observability:"
docker compose --env-file $composeEnvFile -f $composeFile ps
Write-Host ""
Write-Host "Procesos puente:"

foreach ($pidFile in Get-ChildItem -Path $stateDir -Filter *.pid -ErrorAction SilentlyContinue) {
  $pid = Get-Content $pidFile.FullName | Select-Object -First 1
  $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
  $status = if ($process) { "running" } else { "stopped" }
  Write-Host "$($pidFile.BaseName): $status"
}

Write-Host ""
Write-Host "Endpoints:"
Write-Host "Grafana:    http://localhost:3300"
Write-Host "Prometheus: http://localhost:9091"
Write-Host "Loki:       http://localhost:3310"
Write-Host "Tempo:      http://localhost:3320"
Write-Host "Frontend:   http://localhost:18080/health/ready"
Write-Host "API:        http://localhost:13100/health/ready"
Write-Host "Parser:     http://localhost:13108/health/ready"
Write-Host "Engine:     http://localhost:18000/health/ready"
