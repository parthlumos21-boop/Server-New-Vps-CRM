@echo off
setlocal

set "MONGOD=%~dp0mongodb-local\mongodb-win32-x86_64-windows-7.0.14\bin\mongod.exe"
set "DATADIR=%~dp0mongodb-local\data"
set "PORT=27017"

if not exist "%MONGOD%" (
    echo ERROR: mongod.exe not found at: %MONGOD%
    exit /b 1
)

if not exist "%DATADIR%" (
    mkdir "%DATADIR%"
)

echo Starting MongoDB 7.0.14 on port %PORT%...
echo   Data directory: %DATADIR%
start "" "%MONGOD%" --dbpath "%DATADIR%" --port %PORT%
echo.
echo MongoDB started!
echo Connection URI: mongodb://127.0.0.1:%PORT%/crm
