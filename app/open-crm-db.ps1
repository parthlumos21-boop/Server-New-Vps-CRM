param(
  [string]$EnvPath = "server\.env"
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string]$Path,
    [string[]]$Names
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    foreach ($name in $Names) {
      if ($trimmed.StartsWith("$name=")) {
        return $trimmed.Substring($name.Length + 1).Trim().Trim('"').Trim("'")
      }
    }
  }

  return $null
}

function Redact-MongoUri {
  param([string]$MongoUri)

  return $MongoUri -replace "//([^:@/]+):([^@/]+)@", "//***:***@"
}

function Add-DatabaseNameToMongoUri {
  param(
    [string]$MongoUri,
    [string]$DatabaseName
  )

  if (-not $DatabaseName) {
    return $MongoUri
  }

  try {
    $parsedUri = [System.UriBuilder]::new($MongoUri)
    $currentPath = $parsedUri.Path.Trim("/")
    if ($currentPath) {
      return $MongoUri
    }

    $parsedUri.Path = $DatabaseName
    return $parsedUri.Uri.AbsoluteUri
  } catch {
    if ($MongoUri -match "mongodb(\+srv)?://[^/]+/\?") {
      return $MongoUri -replace "/\?", "/$DatabaseName`?"
    }

    if ($MongoUri -match "mongodb(\+srv)?://[^/]+\?") {
      return $MongoUri -replace "\?", "/$DatabaseName`?"
    }

    return $MongoUri
  }
}

$MongoUri = Get-EnvValue -Path $EnvPath -Names @("MONGODB_URI", "MONGO_URI")
$DatabaseName = Get-EnvValue -Path $EnvPath -Names @("MONGODB_DB", "MONGO_DB")

if (-not $MongoUri) {
  throw "Set MONGODB_URI in $EnvPath before opening MongoDB Compass."
}

if (-not $DatabaseName) {
  $DatabaseName = "crm"
}

$CompassUri = Add-DatabaseNameToMongoUri -MongoUri $MongoUri -DatabaseName $DatabaseName

Write-Host "CRM MongoDB URI for Compass:" -ForegroundColor Cyan
Write-Host (Redact-MongoUri -MongoUri $CompassUri)
Write-Host ""
Write-Host "Database name: $DatabaseName"
Write-Host ""

$compassCommand = Get-Command "MongoDBCompass.exe" -ErrorAction SilentlyContinue

if (-not $compassCommand) {
  $programFilesX86 = [Environment]::GetFolderPath("ProgramFilesX86")
  $possibleCompassPaths = @(
    (Join-Path $env:LOCALAPPDATA "Programs\MongoDB Compass\MongoDBCompass.exe"),
    (Join-Path $env:ProgramFiles "MongoDB Compass\MongoDBCompass.exe"),
    (Join-Path $programFilesX86 "MongoDB Compass\MongoDBCompass.exe")
  )

  $compassPath = $possibleCompassPaths | Where-Object {
    $_ -and (Test-Path -LiteralPath $_)
  } | Select-Object -First 1
} else {
  $compassPath = $compassCommand.Source
}

if ($compassPath) {
  Write-Host "Opening MongoDB Compass..." -ForegroundColor Green
  Start-Process -FilePath $compassPath -ArgumentList $CompassUri
  exit 0
}

Write-Warning "MongoDB Compass was not found on this machine."
Write-Host "Open MongoDB Compass manually and paste this URI:" -ForegroundColor Yellow
Write-Host $CompassUri
