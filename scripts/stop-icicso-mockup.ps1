$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path $repoRoot "logs\mockup\runtime-state.json"

function Write-Status {
    param([string] $Message)
    Write-Output $Message
}

if (-not (Test-Path -LiteralPath $stateFile)) {
    Write-Status "No hay runtime-state registrado."
    exit 0
}

try {
    $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
}
catch {
    Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
    Write-Status "El archivo de estado estaba corrupto y fue eliminado."
    exit 0
}

foreach ($processInfo in $state.processes) {
    if ($processInfo.pid) {
        try {
            Stop-Process -Id ([int] $processInfo.pid) -Force -ErrorAction Stop
            Write-Status ("Detenido {0} (PID {1})" -f $processInfo.name, $processInfo.pid)
        }
        catch {
            Write-Status ("No se pudo detener {0} (PID {1}); probablemente ya terminó." -f $processInfo.name, $processInfo.pid)
        }
    }
}

Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
Write-Status "Mockup ICICSO detenido."
