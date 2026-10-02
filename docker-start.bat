@echo off
cd /d "%~dp0"
echo Starting Meal app container...
docker compose up -d
echo Container started! Website available at http://localhost:3000
pause
