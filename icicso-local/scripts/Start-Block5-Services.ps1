Set-Location (Join-Path $PSScriptRoot "..")

pnpm build:block5 | Out-Host

$services = @(
  @{ Name = "ghl-service"; Path = "apps/ghl-service/dist/index.js" },
  @{ Name = "kbol-service"; Path = "apps/kbol-service/dist/index.js" },
  @{ Name = "gateway-api"; Path = "apps/gateway-api/dist/index.js" }
)

foreach ($service in $services) {
  Start-Process -FilePath "node" -ArgumentList $service.Path -WorkingDirectory (Get-Location) -WindowStyle Hidden | Out-Null
}

Write-Host "Block 5 services running:"
Write-Host "ghl-service   http://127.0.0.1:3105/health"
Write-Host "kbol-service  http://127.0.0.1:3106/health"
Write-Host "gateway-api   http://127.0.0.1:3100/health"
