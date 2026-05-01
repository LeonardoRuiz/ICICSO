[CmdletBinding()]
param(
    [switch]$DeleteData
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$k8sDir = Join-Path $repoRoot "infra\k8s"
$namespace = "icicso-local"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList
    )

    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        Fail ("Command failed: {0} {1}" -f $FilePath, ($ArgumentList -join " "))
    }
}

try {
    Write-Step "Eliminando recursos Kubernetes de ICICSO"
    Invoke-External -FilePath "kubectl" -ArgumentList @("delete", "-k", $k8sDir, "--ignore-not-found=true")

    if ($DeleteData) {
        Write-Step "Eliminando PVCs"
        Invoke-External -FilePath "kubectl" -ArgumentList @("delete", "pvc", "icicso-postgres-data", "icicso-redis-data", "-n", $namespace, "--ignore-not-found=true")
    }

    Write-Step "Estado final"
    & kubectl get all -n $namespace
}
catch {
    Fail $_.Exception.Message
}
