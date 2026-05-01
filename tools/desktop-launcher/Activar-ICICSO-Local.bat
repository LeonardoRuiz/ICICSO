@echo off
setlocal

set "REPO_ROOT=%~dp0..\.."
set "LAUNCHER=%REPO_ROOT%\Launch-ICICSO-Continuum.cmd"

if not exist "%LAUNCHER%" (
  echo No se encontro el launcher principal:
  echo %LAUNCHER%
  pause
  exit /b 1
)

call "%LAUNCHER%" %*
exit /b %errorlevel%
