Set-Location (Join-Path $PSScriptRoot "..")

pnpm build:block7 | Out-Host

$services = @(
  @{ Name = "case-control-service"; Path = "apps/case-control-service/dist/index.js" },
  @{ Name = "gateway-api"; Path = "apps/gateway-api/dist/index.js" }
)

foreach ($service in $services) {
  Start-Process -FilePath "node" -ArgumentList $service.Path -WorkingDirectory (Get-Location) -WindowStyle Hidden | Out-Null
}

Write-Host "Block 7 services running:"
Write-Host "case-control-service http://127.0.0.1:3113/health"
Write-Host "gateway-api          http://127.0.0.1:3100/health"
