@echo off
title ecukur Payment Monitor Bot
cd /d "%~dp0"
echo ==============================================
echo   Memulai ecukur Telegram Payment Monitor...
echo ==============================================
:loop
python bot.py
echo.
echo [PERINGATAN] Bot terhenti pada %date% %time%
echo Memulai ulang bot dalam 3 detik...
timeout /t 3 /nobreak >nul
goto loop
