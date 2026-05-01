@echo off
setlocal
set ROOT=C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO
set WORKDIR=%ROOT%\services\ingestion-orquestador
set VENV_PY=%ROOT%\.venv\Scripts\python.exe

if exist "%VENV_PY%" (
  set PY_CMD=%VENV_PY%
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    set PY_CMD=py
  ) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
      set PY_CMD=python
    ) else (
      echo No se encontro Python utilizable. Se esperaba "%VENV_PY%" o py/python en PATH.
      pause
      exit /b 1
    )
  )
)

echo Iniciando ICICSO Ingestion API en http://127.0.0.1:8000
echo Working dir: %WORKDIR%
echo Python: %PY_CMD%
start "ICICSO Ingestion API" cmd /k "cd /d %WORKDIR% && \"%PY_CMD%\" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
endlocal
