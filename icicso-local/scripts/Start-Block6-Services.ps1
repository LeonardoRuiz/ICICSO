Set-Location (Join-Path $PSScriptRoot "..")

pnpm build:block6 | Out-Host

$services = @(
  @{ Name = "data-governance-service"; Path = "apps/data-governance-service/dist/index.js" },
  @{ Name = "runbook-service"; Path = "apps/runbook-service/dist/index.js" },
  @{ Name = "readiness-service"; Path = "apps/readiness-service/dist/index.js" },
  @{ Name = "gateway-api"; Path = "apps/gateway-api/dist/index.js" }
)

foreach ($service in $services) {
  Start-Process -FilePath "node" -ArgumentList $service.Path -WorkingDirectory (Get-Location) -WindowStyle Hidden | Out-Null
}

Write-Host "Block 6 services running:"
Write-Host "data-governance-service http://127.0.0.1:3110/health"
Write-Host "runbook-service         http://127.0.0.1:3111/health"
Write-Host "readiness-service       http://127.0.0.1:3112/health"
Write-Host "gateway-api             http://127.0.0.1:3100/health"
