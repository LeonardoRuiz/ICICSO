Set-Location (Join-Path $PSScriptRoot "..")

pnpm build:block1 | Out-Host

$services = @(
  @{ Name = "audit-service"; Path = "apps/audit-service/dist/index.js" },
  @{ Name = "auth-service"; Path = "apps/auth-service/dist/index.js" },
  @{ Name = "identity-service"; Path = "apps/identity-service/dist/index.js" },
  @{ Name = "gateway-api"; Path = "apps/gateway-api/dist/index.js" }
)

foreach ($service in $services) {
  Start-Process -FilePath "node" -ArgumentList $service.Path -WorkingDirectory (Get-Location) -WindowStyle Hidden | Out-Null
}

Write-Host "Block 1 services running:"
Write-Host "gateway-api     http://127.0.0.1:3100/health"
Write-Host "auth-service    http://127.0.0.1:3101/health"
Write-Host "identity-service http://127.0.0.1:3102/health"
Write-Host "audit-service   http://127.0.0.1:3103/health"
