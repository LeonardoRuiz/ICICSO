[CmdletBinding()]
param(
    [switch]$ValidateOnly,
    [switch]$SkipDockerBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$icicsoLocalRoot = Join-Path $repoRoot "icicso-local"
$engineRoot = Join-Path $icicsoLocalRoot "engines\13_semantic_terminology_engine"
$k8sDir = Join-Path $repoRoot "infra\k8s"
$artifactsDir = Join-Path $repoRoot "dist\cicd"
$renderedManifest = Join-Path $artifactsDir "k8s-rendered.yaml"
$imageTagsFile = Join-Path $artifactsDir "image-tags.txt"
$summaryFile = Join-Path $artifactsDir "ci-summary.txt"
$engineVenv = Join-Path $engineRoot ".venv-cicd"

$env:TURBO_DAEMON = "false"

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

    Push-Location $WorkingDirectory
    try {
        & $FilePath @ArgumentList
        if ($LASTEXITCODE -ne 0) {
            Fail ("Command failed: {0} {1}" -f $FilePath, ($ArgumentList -join " "))
        }
    }
    finally {
        Pop-Location
    }
}

function Get-PythonCommand {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @("python")
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @("py", "-3")
    }
    Fail "No se encontró Python en PATH."
}

function Get-EnginePythonCommand {
    if (-not (Test-Path $engineVenv)) {
        $python = Get-PythonCommand
        $prefixArgs = @($python | Select-Object -Skip 1)
        Invoke-External -FilePath $python[0] -ArgumentList ($prefixArgs + @("-m", "venv", $engineVenv)) -WorkingDirectory $engineRoot
    }

    $windowsPython = Join-Path $engineVenv "Scripts\python.exe"
    if (Test-Path $windowsPython) {
        return @($windowsPython)
    }

    $unixPython = Join-Path $engineVenv "bin/python"
    if (Test-Path $unixPython) {
        return @($unixPython)
    }

    Fail "No se pudo localizar el Python del virtualenv en $engineVenv"
}

function Invoke-Python {
    param(
        [Parameter(Mandatory = $true)][string[]]$ArgumentList,
        [string]$WorkingDirectory = $repoRoot
    )

    $python = Get-PythonCommand
    $prefixArgs = @($python | Select-Object -Skip 1)
    Invoke-External -FilePath $python[0] -ArgumentList ($prefixArgs + $ArgumentList) -WorkingDirectory $WorkingDirectory
}

function Ensure-PythonModule {
    param([string]$ModuleName, [string]$PackageName)

    $python = Get-PythonCommand
    & $python[0] @(@($python | Select-Object -Skip 1) + @("-c", "import $ModuleName")) 2>$null
    if ($LASTEXITCODE -ne 0) {
        Invoke-Python -ArgumentList @("-m", "pip", "install", $PackageName)
    }
}

function Assert-Path([string]$PathToCheck) {
    if (-not (Test-Path $PathToCheck)) {
        Fail "Ruta requerida no encontrada: $PathToCheck"
    }
}

function Write-Summary([string[]]$Lines) {
    New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null
    $Lines | Set-Content -Path $summaryFile -Encoding UTF8
}

function Validate-Structure {
    Write-Step "Validando estructura del repo"
    @(
        $icicsoLocalRoot,
        $engineRoot,
        (Join-Path $repoRoot "infra\docker\node-runtime.Dockerfile"),
        (Join-Path $repoRoot "infra\docker\frontend.Dockerfile"),
        (Join-Path $repoRoot "icicso-local\engines\13_semantic_terminology_engine\Dockerfile"),
        (Join-Path $repoRoot "scripts\k8s-up.ps1"),
        $k8sDir
    ) | ForEach-Object { Assert-Path $_ }
}

function Validate-ConfigurationContracts {
    Write-Step "Validando contratos, ejemplos y exposicion de secretos"
    Invoke-Python -ArgumentList @((Join-Path $repoRoot "scripts\config_tools.py"), "sync-check")
    Invoke-Python -ArgumentList @((Join-Path $repoRoot "scripts\config_tools.py"), "secret-scan")
}

function Install-Dependencies {
    Write-Step "Instalando dependencias Node del monorepo"
    Invoke-External -FilePath "corepack" -ArgumentList @("enable")
    Invoke-External -FilePath "pnpm" -ArgumentList @("install", "--frozen-lockfile") -WorkingDirectory $icicsoLocalRoot

    Write-Step "Instalando dependencias Python del engine"
    $enginePython = Get-EnginePythonCommand
    Invoke-External -FilePath $enginePython[0] -ArgumentList @("-m", "pip", "install", "--upgrade", "pip") -WorkingDirectory $engineRoot
    Invoke-External -FilePath $enginePython[0] -ArgumentList @("-m", "pip", "install", "-e", ".[dev]") -WorkingDirectory $engineRoot
}

function Run-Lint {
    Write-Step "Ejecutando lint"
    Invoke-External -FilePath "pnpm" -ArgumentList @("lint:repo") -WorkingDirectory $icicsoLocalRoot
}

function Run-Typecheck {
    Write-Step "Ejecutando typecheck"
    Invoke-External -FilePath "pnpm" -ArgumentList @("typecheck:repo") -WorkingDirectory $icicsoLocalRoot
}

function Run-Tests {
    Write-Step "Ejecutando tests reales del repo"
    $enginePython = Get-EnginePythonCommand
    Invoke-External -FilePath $enginePython[0] -ArgumentList @("-m", "pytest", "tests", "-q") -WorkingDirectory $engineRoot
}

function Run-Build {
    Write-Step "Generando Prisma client"
    Invoke-External -FilePath "pnpm" -ArgumentList @("--filter", "@icicso/database", "db:generate") -WorkingDirectory $icicsoLocalRoot

    Write-Step "Compilando servicios requeridos"
    Invoke-External -FilePath "pnpm" -ArgumentList @("build:block8") -WorkingDirectory $icicsoLocalRoot
}

function Get-ShortSha {
    $sha = (& git rev-parse --short HEAD 2>$null)
    if ($LASTEXITCODE -eq 0 -and $sha) {
        return $sha.Trim()
    }
    return "local"
}

function Build-Images {
    if ($SkipDockerBuild -or $ValidateOnly) {
        return
    }

    $sha = Get-ShortSha
    New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null

    $tags = @(
        "icicso/node-runtime:dev",
        "icicso/node-runtime:$sha",
        "icicso/frontend-local:dev",
        "icicso/frontend-local:$sha",
        "icicso/semantic-terminology-engine:dev",
        "icicso/semantic-terminology-engine:$sha"
    )
    $tags | Set-Content -Path $imageTagsFile -Encoding UTF8

    Write-Step "Construyendo imagen icicso/node-runtime"
    Invoke-External -FilePath "docker" -ArgumentList @(
        "build",
        "-f", (Join-Path $repoRoot "infra\docker\node-runtime.Dockerfile"),
        "-t", "icicso/node-runtime:dev",
        "-t", "icicso/node-runtime:$sha",
        "."
    )

    Write-Step "Construyendo imagen icicso/frontend-local"
    Invoke-External -FilePath "docker" -ArgumentList @(
        "build",
        "-f", (Join-Path $repoRoot "infra\docker\frontend.Dockerfile"),
        "-t", "icicso/frontend-local:dev",
        "-t", "icicso/frontend-local:$sha",
        "."
    )

    Write-Step "Construyendo imagen icicso/semantic-terminology-engine"
    Invoke-External -FilePath "docker" -ArgumentList @(
        "build",
        "-f", (Join-Path $repoRoot "icicso-local\engines\13_semantic_terminology_engine\Dockerfile"),
        "-t", "icicso/semantic-terminology-engine:dev",
        "-t", "icicso/semantic-terminology-engine:$sha",
        (Join-Path $repoRoot "icicso-local\engines\13_semantic_terminology_engine")
    )
}

function Validate-K8s {
    Write-Step "Validando manifests Kubernetes"
    Invoke-External -FilePath "kubectl" -ArgumentList @("version", "--client", "--output=yaml")
    Ensure-PythonModule -ModuleName "yaml" -PackageName "pyyaml"
    Invoke-Python -ArgumentList @((Join-Path $repoRoot "scripts\config_tools.py"), "validate", "--environment", "local", "--allow-placeholders", "--sync")

    New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null
    $rendered = & kubectl kustomize $k8sDir
    if ($LASTEXITCODE -ne 0) {
        Fail "kubectl kustomize falló para $k8sDir"
    }
    $rendered | Set-Content -Path $renderedManifest -Encoding UTF8

    $pythonScript = @'
import sys
from pathlib import Path
import yaml

rendered = Path(sys.argv[1])
docs = [doc for doc in yaml.safe_load_all(rendered.read_text(encoding="utf-8")) if doc]
if not docs:
    raise SystemExit("No Kubernetes documents were rendered")

names = set()
for doc in docs:
    api_version = doc.get("apiVersion")
    kind = doc.get("kind")
    metadata = doc.get("metadata") or {}
    name = metadata.get("name")
    namespace = metadata.get("namespace", "")
    if not api_version or not kind or not name:
        raise SystemExit(f"Manifest incompleto: {doc}")
    key = (kind, namespace, name)
    if key in names:
        raise SystemExit(f"Recurso duplicado: {kind}/{name} namespace={namespace}")
    names.add(key)
    if kind == "Deployment":
        selector = (((doc.get("spec") or {}).get("selector") or {}).get("matchLabels") or {})
        template_labels = ((((doc.get("spec") or {}).get("template") or {}).get("metadata") or {}).get("labels") or {})
        if not selector:
            raise SystemExit(f"Deployment sin selector: {name}")
        for label_key, label_value in selector.items():
            if template_labels.get(label_key) != label_value:
                raise SystemExit(f"Selector inconsistente en deployment {name}: {label_key}")
    if kind == "Service":
        selector = ((doc.get("spec") or {}).get("selector") or {})
        if not selector:
            raise SystemExit(f"Service sin selector: {name}")
print(f"Validated {len(docs)} rendered Kubernetes resources")
'@
    $pythonScript | Invoke-Python -ArgumentList @("-", $renderedManifest)
}

try {
    Validate-Structure
    Validate-ConfigurationContracts
    Validate-K8s

    if (-not $ValidateOnly) {
        Install-Dependencies
        Run-Lint
        Run-Typecheck
        Run-Tests
        Run-Build
        Build-Images
        Write-Summary @(
            "CI local completada",
            "Lint: OK",
            "Typecheck: OK",
            "Tests: OK (engine Python)",
            "Build: OK",
            ("Rendered manifests: {0}" -f $renderedManifest),
            ("Image tags: {0}" -f $imageTagsFile)
        )
    }
    else {
        Write-Summary @(
            "Validacion de manifests completada",
            ("Rendered manifests: {0}" -f $renderedManifest)
        )
    }

    Write-Step "Artefactos"
    Write-Host $summaryFile
    if (Test-Path $imageTagsFile) { Write-Host $imageTagsFile }
    if (Test-Path $renderedManifest) { Write-Host $renderedManifest }
}
catch {
    Fail $_.Exception.Message
}
