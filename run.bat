@echo off
REM Windows launcher
cd /d "%~dp0backend"
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
if not exist .env copy .env.example .env >nul
echo Open http://localhost:8000
uvicorn main:app --host 0.0.0.0 --port 8000
