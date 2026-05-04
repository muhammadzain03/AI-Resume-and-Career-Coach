@echo off
setlocal

REM Run from this script's directory so paths stay stable.
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ============================================
echo   Starting ARCC - AI Resume ^& Career Coach
echo ============================================
echo.

REM Start MySQL database via Docker Compose
echo [1/4] Starting MySQL database via Docker...
docker compose up database -d
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Could not start Docker MySQL. Make sure Docker Desktop is running.
    echo         If you have a local MySQL instance, the backend will try to connect to it.
) else (
    echo       MySQL container started.
)

echo [2/4] Waiting for database to initialize...
timeout /t 5 /nobreak >nul

REM Backend terminal — ^&^& so cmd sees && after cd with quoted path
echo [3/4] Starting Flask backend on port 5000...
start "ARCC Backend" cmd /k cd /d "%ROOT%backend" ^&^& python -m pip install -r requirements.txt ^&^& python app.py

REM Frontend terminal (CALL is required for npm.cmd)
echo [4/4] Starting React frontend on port 3000...
start "ARCC Frontend" cmd /k cd /d "%ROOT%frontend" ^&^& if not exist node_modules\ (call npm install) ^&^& set REACT_APP_API_BASE=http://localhost:5000/api ^&^& echo Starting React at http://localhost:3000 ^&^& call npm start

REM Give services a moment to boot, then open app.
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo Done. Check the two terminal windows for status.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
endlocal
