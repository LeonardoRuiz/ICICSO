[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $PSScriptRoot ".observability"
$composeFile = Join-Path $repoRoot "infra\observability\docker-compose.yml"
$composeEnvFile = Join-Path $repoRoot "infra\observability\.env"

function Stop-TrackedProcess($name) {
  $pidFile = Join-Path $stateDir "$name.pid"
  if (-not (Test-Path $pidFile)) {
    return
  }

  $pid = Get-Content $pidFile | Select-Object -First 1
  if ($pid) {
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $pid -Force
    }
  }
  Remove-Item $pidFile -Force
}

if (Test-Path $composeFile) {
  docker compose --env-file $composeEnvFile -f $composeFile down --remove-orphans
}

@(
  "pf-frontend",
  "pf-api",
  "pf-parser",
  "pf-engine",
  "pf-postgres",
  "pf-redis",
  "logs-frontend",
  "logs-api",
  "logs-parser",
  "logs-engine",
  "logs-postgres",
  "logs-redis"
) | ForEach-Object { Stop-TrackedProcess $_ }

Write-Host "Observabilidad ICICSO detenida."
