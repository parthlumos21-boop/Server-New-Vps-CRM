@echo off
set "MONGOSH=%LOCALAPPDATA%\Programs\mongosh\mongosh.exe"
set "CRM_URI=mongodb://127.0.0.1:27017/crm"

if not exist "%MONGOSH%" (
  echo mongosh.exe was not found at:
  echo %MONGOSH%
  exit /b 1
)

echo Opening CRM database:
echo %CRM_URI%
"%MONGOSH%" "%CRM_URI%"
