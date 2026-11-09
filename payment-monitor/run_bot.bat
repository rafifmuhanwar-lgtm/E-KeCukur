@echo off
title ecukur Payment Monitor Bot
cd /d "%~dp0"
set "PYTHON=%~dp0venv\Scripts\python.exe"
echo ==============================================
echo   Memulai ecukur Telegram Payment Monitor...
echo ==============================================
if not exist "%PYTHON%" (
    echo [ERROR] Virtual environment tidak ditemukan:
    echo %PYTHON%
    echo Buat virtual environment dan install requirements.txt terlebih dahulu.
    pause
    exit /b 1
)
:loop
"%PYTHON%" bot.py
echo.
echo [PERINGATAN] Bot terhenti pada %date% %time%
echo Memulai ulang bot dalam 3 detik...
timeout /t 3 /nobreak >nul
goto loop
