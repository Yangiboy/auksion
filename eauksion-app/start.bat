@echo off
echo E-Auksion serverni ishga tushirish...
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [XATO] Node.js topilmadi!
    echo Node.js yuklab oling: https://nodejs.org
    pause
    exit /b 1
)
echo Node.js topildi.
echo Server ishga tushmoqda...
echo.
echo Brauzerda oching: http://localhost:3000
echo Toxtatish uchun: Ctrl+C
echo.
start "" "http://localhost:3000"
node server.js
pause
