@echo off
setlocal

set "REPO_ROOT=%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\scripts\start-icicso-mockup.ps1" %*
exit /b %errorlevel%
