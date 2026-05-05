@echo off
echo Starting Gyoza Blog...
echo.
cd /d "%~dp0"
start http://localhost:4321
pnpm dev
