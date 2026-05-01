[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$namespace = "icicso-local"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

try {
    $context = (& kubectl config current-context 2>$null).Trim()
    if (-not $context) {
        Fail "kubectl no tiene contexto activo."
    }

    Write-Step "Contexto"
    Write-Host "kubectl current-context: $context"

    Write-Step "Pods"
    & kubectl get pods -n $namespace -o wide
    if ($LASTEXITCODE -ne 0) { Fail "No fue posible listar pods en $namespace." }

    Write-Step "Services"
    & kubectl get services -n $namespace
    if ($LASTEXITCODE -ne 0) { Fail "No fue posible listar services en $namespace." }

    Write-Step "Ingress"
    & kubectl get ingress -n $namespace
    if ($LASTEXITCODE -ne 0) { Fail "No fue posible listar ingress en $namespace." }

    Write-Step "Endpoints esperados"
    Write-Host "Frontend (Ingress): http://icicso.localtest.me/"
    Write-Host "API (Ingress):      http://icicso.localtest.me/api/health"
    Write-Host "Bloque 1:           http://icicso.localtest.me/api/block1/overview"
}
catch {
    Fail $_.Exception.Message
}
