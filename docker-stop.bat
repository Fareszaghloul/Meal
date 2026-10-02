@echo off
cd /d "%~dp0"
echo Stopping Meal app container...
docker compose down
echo Container stopped.
pause
