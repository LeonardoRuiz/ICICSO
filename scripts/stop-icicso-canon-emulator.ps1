param(
    [int] $Port = 8098
)

$ErrorActionPreference = "Stop"

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

if (-not $connections) {
    Write-Host "No hay proceso escuchando en el puerto $Port." -ForegroundColor Yellow
    exit 0
}

foreach ($pid in $connections) {
    try {
        $process = Get-Process -Id $pid -ErrorAction Stop
        Write-Host "Deteniendo PID $pid ($($process.ProcessName)) en puerto $Port..."
        Stop-Process -Id $pid -Force -ErrorAction Stop
    }
    catch {
        Write-Host ("No se pudo detener PID {0}: {1}" -f $pid, $_.Exception.Message)
    }
}

Write-Host "Emulador canónico ICICSO detenido."
