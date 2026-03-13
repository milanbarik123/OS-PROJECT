@echo off
echo Cleaning previous installation...
cd os-sim-react
if exist node_modules (
    rmdir /s /q node_modules
)
if exist package-lock.json (
    del package-lock.json
)
echo Installing Stable Dependencies...
call npm install
echo Starting Development Server...
call npm run dev
pause
