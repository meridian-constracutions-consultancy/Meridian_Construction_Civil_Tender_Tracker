@echo off
title CivilTender India - Free Civil Tender Intelligence Platform
echo ===================================================================
echo   CivilTender India - Civil Construction Intelligence Platform
echo ===================================================================
echo.
cd /d "%~dp0"

if exist ".\venv\Scripts\python.exe" (
    echo [1/2] Activating Python virtual environment...
    call .\venv\Scripts\activate
    echo [2/2] Launching platform on http://127.0.0.1:8000 ...
    echo.
    echo Dashboard URL : http://127.0.0.1:8000
    echo API Docs URL  : http://127.0.0.1:8000/docs
    echo.
    echo Opening browser in 3 seconds...
    start http://127.0.0.1:8000
    echo Server running. Press Ctrl+C in this window to stop.
    echo ===================================================================
    python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
) else (
    echo [ERROR] Virtual environment 'venv' not found in current directory.
    echo Please ensure the project dependencies are installed.
    pause
)
