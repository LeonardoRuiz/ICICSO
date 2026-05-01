Set-Location (Join-Path $PSScriptRoot "..")

pnpm build:block8 | Out-Host

$services = @(
  @{ Name = "systemic-risk-service"; Path = "apps/systemic-risk-service/dist/index.js" },
  @{ Name = "cqoi-service"; Path = "apps/cqoi-service/dist/index.js" },
  @{ Name = "gateway-api"; Path = "apps/gateway-api/dist/index.js" }
)

foreach ($service in $services) {
  Start-Process -FilePath "node" -ArgumentList $service.Path -WorkingDirectory (Get-Location) -WindowStyle Hidden | Out-Null
}

Write-Host "Block 8 services running:"
Write-Host "systemic-risk-service  http://127.0.0.1:3114/health"
Write-Host "cqoi-service           http://127.0.0.1:3115/health"
Write-Host "gateway-api            http://127.0.0.1:3100/health"
