# Start local MongoDB server for CRM development
$ErrorActionPreference = "Stop"

$mongod = Join-Path $PSScriptRoot "mongodb-local\mongodb-win32-x86_64-windows-7.0.14\bin\mongod.exe"
$dataDir = Join-Path $PSScriptRoot "mongodb-local\data"
$port = 27017

# Check if mongod is already running
$existing = Get-Process mongod -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "MongoDB is already running (PID: $($existing.Id))" -ForegroundColor Yellow
    Write-Host "Listening on port $port" -ForegroundColor Gray
    exit 0
}

# Verify binaries exist
if (-not (Test-Path $mongod)) {
    Write-Host "ERROR: mongod.exe not found at: $mongod" -ForegroundColor Red
    exit 1
}

# Create data directory if missing
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "Created data directory: $dataDir" -ForegroundColor Gray
}

# Start mongod
Write-Host "Starting MongoDB 7.0.14 on port $port..." -ForegroundColor Cyan
Write-Host "  Data directory: $dataDir" -ForegroundColor Gray
Write-Host "  Binary: $mongod" -ForegroundColor Gray

Start-Process -FilePath $mongod -ArgumentList "--dbpath `"$dataDir`" --port $port" -NoNewWindow

# Wait briefly and verify
Start-Sleep -Seconds 2
$running = Get-Process mongod -ErrorAction SilentlyContinue
if ($running) {
    Write-Host ""
    Write-Host "MongoDB started successfully! (PID: $($running.Id))" -ForegroundColor Green
    Write-Host "Connection URI: mongodb://127.0.0.1:${port}/crm" -ForegroundColor Cyan
} else {
    Write-Host "WARNING: MongoDB process not detected after startup." -ForegroundColor Red
    exit 1
}
