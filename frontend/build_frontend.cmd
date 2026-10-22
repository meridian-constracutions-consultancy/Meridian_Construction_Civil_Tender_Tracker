@echo off
cd /d "%~dp0"
set NODE_PATH=C:\Users\pc\tender_frontend_env\node_modules
npx --prefix C:\Users\pc\tender_frontend_env vite build --config C:\Users\pc\tender_frontend_env\node_modules\.bin\..\..
