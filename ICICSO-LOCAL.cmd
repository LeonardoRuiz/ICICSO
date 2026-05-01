@echo off
cd /d "%~dp0"
echo ICICSO Local Engine + Viewer
echo.
echo Running engine and starting viewer...
echo.
pnpm dev
echo.
echo ICICSO stopped. Press any key to close.
pause >nul
