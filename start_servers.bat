@echo off
echo 🚀 Starting QPDS Servers...
echo.

echo 📋 Prerequisites:
echo 1. Make sure MongoDB is running
echo 2. Check if ports 3000 and 5001 are available
echo.

echo 🔧 Starting Backend Server...
start "Backend Server" cmd /k "cd QPDS_Restructured\backend && npm start"

timeout /t 3 /nobreak > nul

echo 🌐 Starting Frontend Server...
start "Frontend Server" cmd /k "cd QPDS_Restructured\frontend_end && npm start"

echo.
echo ✅ Servers starting...
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:5001
echo.
echo Press any key to exit...
pause > nul
