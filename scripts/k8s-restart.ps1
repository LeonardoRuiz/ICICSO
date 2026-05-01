[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$namespace = "icicso-local"
$deployments = @(
    "icicso-postgres",
    "icicso-redis",
    "icicso-engine",
    "icicso-parser",
    "icicso-api",
    "icicso-frontend"
)

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
    foreach ($deployment in $deployments) {
        Write-Step "Reiniciando $deployment"
        Invoke-External -FilePath "kubectl" -ArgumentList @("rollout", "restart", ("deployment/{0}" -f $deployment), "-n", $namespace)
        Invoke-External -FilePath "kubectl" -ArgumentList @("rollout", "status", ("deployment/{0}" -f $deployment), "-n", $namespace, "--timeout=240s")
    }

    Write-Step "Pods"
    & kubectl get pods -n $namespace -o wide
}
catch {
    Fail $_.Exception.Message
}
