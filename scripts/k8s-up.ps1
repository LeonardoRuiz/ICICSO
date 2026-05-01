[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$k8sDir = Join-Path $repoRoot "infra\k8s"
$nodeDockerfile = Join-Path $repoRoot "infra\docker\node-runtime.Dockerfile"
$frontendDockerfile = Join-Path $repoRoot "infra\docker\frontend.Dockerfile"
$engineDockerfile = Join-Path $repoRoot "icicso-local\engines\13_semantic_terminology_engine\Dockerfile"
$engineContext = Join-Path $repoRoot "icicso-local\engines\13_semantic_terminology_engine"
$namespace = "icicso-local"
$configValidateScript = Join-Path $repoRoot "scripts\config-validate.ps1"
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
        [Parameter(Mandatory = $true)][string[]]$ArgumentList,
        [string]$WorkingDirectory = $repoRoot
    )

    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        Fail ("Command failed: {0} {1}" -f $FilePath, ($ArgumentList -join " "))
    }
}

function Test-DockerDesktopOpen {
    $processes = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessName -in @("Docker Desktop", "DockerDesktop", "com.docker.backend")
    }

    if (-not $processes) {
        Fail "Docker Desktop no parece estar abierto. Abre Docker Desktop y vuelve a ejecutar el script."
    }
}

function Test-DockerResponsive {
    $null = & docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -ne 0) {
        Fail "Docker responde con error. Verifica que Docker Desktop esté completamente inicializado."
    }
}

function Test-KubectlReady {
    $null = & kubectl version --client --output=yaml 2>$null
    if ($LASTEXITCODE -ne 0) {
        Fail "kubectl no está disponible en PATH o no responde correctamente."
    }

    $context = (& kubectl config current-context 2>$null).Trim()
    if (-not $context) {
        Fail "kubectl no tiene contexto activo. Esperaba el contexto de Docker Desktop."
    }

    if ($context -ne "docker-desktop") {
        Fail "El contexto actual de kubectl es '$context'. Cambia a 'docker-desktop' antes de continuar."
    }

    $null = & kubectl cluster-info 2>$null
    if ($LASTEXITCODE -ne 0) {
        Fail "Kubernetes no responde en Docker Desktop. Verifica que Kubernetes esté habilitado y arrancado."
    }
}

function Ensure-ConfigReady {
    & $configValidateScript -Environment local -Sync
    if ($LASTEXITCODE -ne 0) {
        Fail "La validacion/sincronizacion de configuracion local fallo."
    }
}

function Build-Images {
    Write-Step "Construyendo imagen icicso/node-runtime:dev"
    Invoke-External -FilePath "docker" -ArgumentList @("build", "-f", $nodeDockerfile, "-t", "icicso/node-runtime:dev", ".")

    Write-Step "Construyendo imagen icicso/frontend-local:dev"
    Invoke-External -FilePath "docker" -ArgumentList @("build", "-f", $frontendDockerfile, "-t", "icicso/frontend-local:dev", ".")

    Write-Step "Construyendo imagen icicso/semantic-terminology-engine:dev"
    Invoke-External -FilePath "docker" -ArgumentList @("build", "-f", $engineDockerfile, "-t", "icicso/semantic-terminology-engine:dev", $engineContext)
}

function Apply-Manifests {
    Write-Step "Aplicando manifests en infra/k8s"
    Invoke-External -FilePath "kubectl" -ArgumentList @("apply", "-k", $k8sDir)
}

function Wait-Deployments {
    foreach ($deployment in $deployments) {
        Write-Step "Esperando rollout de $deployment"
        Invoke-External -FilePath "kubectl" -ArgumentList @(
            "rollout", "status", ("deployment/{0}" -f $deployment),
            "-n", $namespace,
            "--timeout=240s"
        )
    }
}

function Show-Status {
    Write-Step "Pods"
    & kubectl get pods -n $namespace -o wide

    Write-Step "Services"
    & kubectl get services -n $namespace

    Write-Step "Ingress"
    & kubectl get ingress -n $namespace
}

function Show-Endpoints {
    Write-Step "Endpoints finales"
    Write-Host "Frontend (Ingress): http://icicso.localtest.me/"
    Write-Host "API (Ingress):      http://icicso.localtest.me/api/health"
    Write-Host "Bloque 1:           http://icicso.localtest.me/api/block1/overview"
    Write-Host "Port-forward FE:    kubectl port-forward -n $namespace service/icicso-frontend 8080:80"
    Write-Host "Port-forward API:   kubectl port-forward -n $namespace service/icicso-api 3100:3100"
}

try {
    Write-Step "Validando Docker Desktop"
    Test-DockerDesktopOpen
    Test-DockerResponsive

    Write-Step "Validando kubectl y Kubernetes"
    Test-KubectlReady

    Write-Step "Validando configuracion local y generando secretos Kubernetes"
    Ensure-ConfigReady

    Build-Images
    Apply-Manifests
    Wait-Deployments
    Show-Status
    Show-Endpoints
}
catch {
    Fail $_.Exception.Message
}
