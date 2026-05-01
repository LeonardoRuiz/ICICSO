[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$namespace = "icicso-local"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$artifactsDir = Join-Path $repoRoot "dist\cicd"
$summaryFile = Join-Path $artifactsDir "smoke-summary.txt"
$portForwardProcesses = @()

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

function Start-PortForward {
    param(
        [string]$ServiceName,
        [int]$LocalPort,
        [int]$RemotePort
    )

    $stdout = Join-Path $env:TEMP ("{0}-{1}.out.log" -f $ServiceName, $LocalPort)
    $stderr = Join-Path $env:TEMP ("{0}-{1}.err.log" -f $ServiceName, $LocalPort)
    $process = Start-Process -FilePath "kubectl" -ArgumentList @(
        "port-forward",
        "-n", $namespace,
        ("service/{0}" -f $ServiceName),
        ("{0}:{1}" -f $LocalPort, $RemotePort)
    ) -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru

    $script:portForwardProcesses += $process
}

function Stop-PortForwards {
    foreach ($process in $script:portForwardProcesses) {
        if ($process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
        }
    }
}

function Wait-Http {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 40
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    Fail "Timeout esperando $Url"
}

function Assert-JsonValue {
    param(
        [string]$Url,
        [scriptblock]$Assertion,
        [string]$ErrorMessage
    )

    $payload = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
    if (-not (& $Assertion $payload)) {
        Fail $ErrorMessage
    }
}

try {
    New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null

    Write-Step "Abriendo port-forward para smoke tests"
    Start-PortForward -ServiceName "icicso-frontend" -LocalPort 18080 -RemotePort 80
    Start-PortForward -ServiceName "icicso-api" -LocalPort 13100 -RemotePort 3100
    Start-PortForward -ServiceName "icicso-parser" -LocalPort 13108 -RemotePort 3108
    Start-PortForward -ServiceName "icicso-engine" -LocalPort 18000 -RemotePort 8000

    Wait-Http -Url "http://127.0.0.1:18080/"
    Wait-Http -Url "http://127.0.0.1:13100/health"
    Wait-Http -Url "http://127.0.0.1:13108/health"
    Wait-Http -Url "http://127.0.0.1:18000/health"

    Write-Step "Validando frontend"
    $frontend = Invoke-WebRequest -Uri "http://127.0.0.1:18080/" -UseBasicParsing
    if ($frontend.StatusCode -ne 200) {
        Fail "Frontend no respondió 200"
    }

    Write-Step "Validando API principal"
    Assert-JsonValue -Url "http://127.0.0.1:13100/health" -Assertion {
        param($payload)
        $payload.service -eq "gateway-api" -and $null -ne $payload.upstream
    } -ErrorMessage "La API principal no respondió como gateway-api"

    Write-Step "Validando parser/ingest"
    Assert-JsonValue -Url "http://127.0.0.1:13108/health" -Assertion {
        param($payload)
        $payload.service -eq "ingestion-service"
    } -ErrorMessage "El parser no respondió como ingestion-service"

    Write-Step "Validando engine clínico"
    Assert-JsonValue -Url "http://127.0.0.1:18000/health" -Assertion {
        param($payload)
        $payload.service -eq "semantic-terminology-engine" -or $payload.status -eq "healthy"
    } -ErrorMessage "El engine clínico no respondió correctamente"

    Write-Step "Validando comunicación entre servicios"
    Assert-JsonValue -Url "http://127.0.0.1:13100/block1/overview" -Assertion {
        param($payload)
        $null -ne $payload.demoCase -and $payload.demoCase.caseId
    } -ErrorMessage "block1/overview no devolvió demoCase"

    Assert-JsonValue -Url "http://127.0.0.1:13100/block2/overview" -Assertion {
        param($payload)
        $null -ne $payload.services -and $payload.services.Count -ge 1
    } -ErrorMessage "block2/overview no devolvió servicios del bloque 2"

    Assert-JsonValue -Url "http://127.0.0.1:13100/block7/case-control/summary" -Assertion {
        param($payload)
        $null -ne $payload.caseControl
    } -ErrorMessage "block7/case-control/summary no devolvió caseControl"

    @(
        "Smoke tests OK",
        "Frontend: http://127.0.0.1:18080/",
        "API: http://127.0.0.1:13100/health",
        "Parser: http://127.0.0.1:13108/health",
        "Engine: http://127.0.0.1:18000/health"
    ) | Set-Content -Path $summaryFile -Encoding UTF8

    Write-Step "Smoke tests completados"
    Write-Host $summaryFile
}
catch {
    Fail $_.Exception.Message
}
finally {
    Stop-PortForwards
}
