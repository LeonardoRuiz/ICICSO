$root = "C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO"
$workdir = Join-Path $root "services\ingestion-orquestador"
$venvPy = Join-Path $root ".venv\Scripts\python.exe"

if (Test-Path $venvPy) {
    $py = $venvPy
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $py = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $py = "python"
} else {
    Write-Host "No se encontro Python utilizable. Se esperaba $venvPy o py/python en PATH."
    exit 1
}

Write-Host "Iniciando ICICSO Ingestion API en http://127.0.0.1:8000"
Write-Host "Working dir: $workdir"
Write-Host "Python: $py"

if ($py -eq "py" -or $py -eq "python") {
    $command = "Set-Location '$workdir'; & $py -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
} else {
    $command = "Set-Location '$workdir'; & '$py' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
}

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $command -WorkingDirectory $workdir
