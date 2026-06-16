@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ============================================
echo   Cleaning RCC project
echo ============================================
echo.

REM Python caches
echo Removing __pycache__ and .pyc files...
for /d /r "%ROOT%backend" %%d in (__pycache__) do (
    if exist "%%d" rd /s /q "%%d"
)
del /s /q "%ROOT%backend\*.pyc" 2>nul

REM pytest / coverage artifacts
for /d /r "%ROOT%" %%d in (.pytest_cache) do (
    if exist "%%d" rd /s /q "%%d"
)
for /d /r "%ROOT%" %%d in (htmlcov) do (
    if exist "%%d" rd /s /q "%%d"
)
if exist "%ROOT%.coverage" del /q "%ROOT%.coverage"

REM Frontend build output
if exist "%ROOT%frontend\build" (
    echo Removing frontend/build...
    rd /s /q "%ROOT%frontend\build"
)

REM Stray zip files at project root
if exist "%ROOT%*.zip" (
    echo Removing root-level .zip files...
    del /q "%ROOT%*.zip"
)

REM egg-info (dir names like package.egg-info)
for /f "delims=" %%d in ('dir /s /b /ad "%ROOT%backend\*.egg-info" 2^>nul') do (
    if exist "%%d" rd /s /q "%%d"
)

REM OS junk
del /s /q "%ROOT%Thumbs.db" 2>nul
del /s /q "%ROOT%.DS_Store" 2>nul

echo.
echo Done. Project is clean.
endlocal
