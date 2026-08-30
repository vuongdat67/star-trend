@echo off
chcp 65001 >nul
title "GitHub Stars & Trending Hub"

echo =======================================================
echo  🌟 Dang khoi dong GitHub Stars ^& Trending Hub...
echo  🌐 Dashboard: http://localhost:5000
echo =======================================================
echo.

python "%~dp0app.py"

pause
