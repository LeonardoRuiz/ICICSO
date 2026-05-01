@echo off
setlocal

set "REPO_ROOT=%~dp0"
set "STARTER=%REPO_ROOT%scripts\start-icicso-mockup.bat"

if not exist "%STARTER%" (
  echo No se encontro el launcher principal:
  echo %STARTER%
  pause
  exit /b 1
)

call "%STARTER%" %*
exit /b %errorlevel%
