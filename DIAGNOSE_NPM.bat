@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\scripts\diagnose-npm.ps1"
pause
