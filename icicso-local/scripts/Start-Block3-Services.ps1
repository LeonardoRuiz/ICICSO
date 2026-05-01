Set-Location (Join-Path $PSScriptRoot "..")

pnpm build:block3 | Out-Host

$services = @(
  @{ Name = "evidence-lake-service"; Path = "apps/evidence-lake-service/dist/index.js" },
  @{ Name = "gateway-api"; Path = "apps/gateway-api/dist/index.js" }
)

foreach ($service in $services) {
  Start-Process -FilePath "node" -ArgumentList $service.Path -WorkingDirectory (Get-Location) -WindowStyle Hidden | Out-Null
}

Write-Host "Block 3 scientific services running:"
Write-Host "evidence-lake-service http://127.0.0.1:3104/health"
Write-Host "gateway-api           http://127.0.0.1:3100/health"
