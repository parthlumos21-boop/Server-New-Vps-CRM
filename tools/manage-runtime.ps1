param(
  [ValidateSet('start', 'stop')]
  [string]$Action = 'start',

  [ValidateSet('backend', 'frontend')]
  [string]$Service
)

$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot
$tmpDir = Join-Path $rootDir 'tmp'

function Ensure-TmpDir {
  if (-not (Test-Path -LiteralPath $tmpDir)) {
    New-Item -ItemType Directory -Path $tmpDir | Out-Null
  }
}

function Invoke-GarbageCollection {
  Write-Host 'Running garbage collection to free PowerShell/.NET memory...'
  try {
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    [System.GC]::Collect()
  } catch {
    Write-Warning "GC invocation failed: $($_.Exception.Message)"
  }
}

function Get-ServiceConfig {
  param(
    [string]$Name
  )

  switch ($Name) {
    'backend' {
      return @{
        Name = 'backend'
        DisplayName = 'CRM Backend'
        WorkingDirectory = Join-Path $rootDir 'server'
        Command = 'node'
        Arguments = @('server.js')
        Port = 5000
        PidFile = Join-Path $tmpDir 'backend.pid'
        StdOut = Join-Path $rootDir 'server-start.log'
        StdErr = Join-Path $rootDir 'server-start.err'
      }
    }
    'frontend' {
      return @{
        Name = 'frontend'
        DisplayName = 'CRM Frontend'
        WorkingDirectory = $rootDir
        Command = 'node'
        Arguments = @('tools/serve-frontend.js')
        Port = 3000
        PidFile = Join-Path $tmpDir 'frontend.pid'
        StdOut = Join-Path $rootDir 'frontend-start.log'
        StdErr = Join-Path $rootDir 'frontend-start.err'
      }
    }
    default {
      throw "Unsupported service: $Name"
    }
  }
}

function Remove-PidFile {
  param(
    [hashtable]$Config
  )

  if (Test-Path -LiteralPath $Config.PidFile) {
    Remove-Item -LiteralPath $Config.PidFile -Force -ErrorAction SilentlyContinue
  }
}

function Get-ExpectedProcessName {
  param(
    [hashtable]$Config
  )

  return [System.IO.Path]::GetFileNameWithoutExtension($Config.Command)
}

function Read-PidRecord {
  param(
    [hashtable]$Config
  )

  if (-not (Test-Path -LiteralPath $Config.PidFile)) {
    return $null
  }

  $rawContent = Get-Content -LiteralPath $Config.PidFile -Raw -ErrorAction SilentlyContinue
  if (-not $rawContent) {
    Remove-PidFile -Config $Config
    return $null
  }

  $rawContent = $rawContent.Trim()
  if (-not $rawContent) {
    Remove-PidFile -Config $Config
    return $null
  }

  $processId = 0
  if ([int]::TryParse($rawContent, [ref]$processId)) {
    return @{
      Pid = $processId
      StartedAtUtc = $null
    }
  }

  try {
    $record = $rawContent | ConvertFrom-Json -ErrorAction Stop
  } catch {
    Remove-PidFile -Config $Config
    return $null
  }

  if (-not [int]::TryParse([string]$record.Pid, [ref]$processId)) {
    Remove-PidFile -Config $Config
    return $null
  }

  return @{
    Pid = $processId
    StartedAtUtc = [string]$record.StartedAtUtc
  }
}

function Test-TrackedProcessMatch {
  param(
    [hashtable]$Config,
    [System.Diagnostics.Process]$Process,
    [hashtable]$PidRecord
  )

  $expectedProcessName = Get-ExpectedProcessName -Config $Config
  if ($Process.ProcessName -ne $expectedProcessName) {
    return $false
  }

  if (-not $PidRecord.StartedAtUtc) {
    return $true
  }

  $recordedStartTimeUtc = [DateTime]::MinValue
  if (-not [DateTime]::TryParse($PidRecord.StartedAtUtc, [ref]$recordedStartTimeUtc)) {
    return $false
  }

  try {
    return $Process.StartTime.ToUniversalTime() -eq $recordedStartTimeUtc.ToUniversalTime()
  } catch {
    return $false
  }
}

function Get-TrackedProcess {
  param(
    [hashtable]$Config
  )

  $pidRecord = Read-PidRecord -Config $Config
  if (-not $pidRecord) {
    return $null
  }

  $process = Get-Process -Id $pidRecord.Pid -ErrorAction SilentlyContinue
  if (-not $process) {
    Remove-PidFile -Config $Config
    return $null
  }

  if (-not (Test-TrackedProcessMatch -Config $Config -Process $process -PidRecord $pidRecord)) {
    Write-Warning "Ignoring stale PID file for $($Config.DisplayName): PID $($pidRecord.Pid) now belongs to '$($process.ProcessName)'."
    Remove-PidFile -Config $Config
    return $null
  }

  return $process
}

function Stop-TrackedProcess {
  param(
    [hashtable]$Config
  )

  $process = Get-TrackedProcess -Config $Config
  if ($process) {
    try {
      Stop-Process -Id $process.Id -Force -ErrorAction Stop
    } catch {
      cmd /c "taskkill /F /T /PID $($process.Id) >nul 2>&1"
      $process.Refresh()
      if (-not $process.HasExited) {
        throw "Failed to stop $($Config.DisplayName) process PID $($process.Id): $($_.Exception.Message)"
      }
    }
    Start-Sleep -Seconds 1
  }

  Remove-PidFile -Config $Config
}

function Get-PortProcessIds {
  param(
    [int]$Port
  )

  $pattern = "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$"
  $pids = @()

  foreach ($line in (netstat -ano -p tcp)) {
    if ($line -match $pattern) {
      $pids += [int]$matches[1]
    }
  }

  return $pids | Sort-Object -Unique
}

function Stop-ConflictingPortProcesses {
  param(
    [hashtable]$Config
  )

  foreach ($processId in (Get-PortProcessIds -Port $Config.Port)) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    cmd /c "taskkill /F /T /PID $processId >nul 2>&1"
    Start-Sleep -Milliseconds 500
  }
}

function Clear-Logs {
  param(
    [hashtable]$Config
  )

  foreach ($logPath in @($Config.StdOut, $Config.StdErr)) {
    if (Test-Path -LiteralPath $logPath) {
      Remove-Item -LiteralPath $logPath -Force -ErrorAction SilentlyContinue
    }
  }
}

function Invoke-FrontendBuild {
  Write-Host 'Building frontend assets...'
  Push-Location $rootDir
  try {
    # Increase Node.js heap for the build to avoid OOM on large projects
    $oldNodeOptions = $env:NODE_OPTIONS
    try {
      $env:NODE_OPTIONS = '--max-old-space-size=8192'
      Invoke-GarbageCollection
      & npm.cmd run build
      if ($LASTEXITCODE -ne 0) {
        throw 'Frontend build failed.'
      }
    } finally {
      if ($null -ne $oldNodeOptions) {
        $env:NODE_OPTIONS = $oldNodeOptions
      } else {
        Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
      }
    }
  } finally {
    Pop-Location
  }
}

function Start-TrackedProcess {
  param(
    [hashtable]$Config
  )

  Ensure-TmpDir
  Stop-TrackedProcess -Config $Config
  Stop-ConflictingPortProcesses -Config $Config
  Clear-Logs -Config $Config

  if ($Config.Name -eq 'frontend') {
    Invoke-FrontendBuild
  }

  $process = Start-Process `
    -FilePath $Config.Command `
    -ArgumentList $Config.Arguments `
    -WorkingDirectory $Config.WorkingDirectory `
    -WindowStyle Hidden `
    -RedirectStandardOutput $Config.StdOut `
    -RedirectStandardError $Config.StdErr `
    -PassThru
  Start-Sleep -Seconds 3

  if ($process.HasExited) {
    $errorMessage = ''
    if (Test-Path -LiteralPath $Config.StdErr) {
      $errorMessage = (Get-Content -LiteralPath $Config.StdErr -ErrorAction SilentlyContinue | Select-Object -Last 20) -join [Environment]::NewLine
    }
    if (-not $errorMessage -and (Test-Path -LiteralPath $Config.StdOut)) {
      $errorMessage = (Get-Content -LiteralPath $Config.StdOut -ErrorAction SilentlyContinue | Select-Object -Last 20) -join [Environment]::NewLine
    }

    Remove-PidFile -Config $Config
    if (-not $errorMessage) {
      $errorMessage = "$($Config.DisplayName) exited immediately."
    }
    throw $errorMessage
  }

  $pidRecord = @{
    Pid = $process.Id
    StartedAtUtc = $process.StartTime.ToUniversalTime().ToString('o')
  }
  $pidRecord | ConvertTo-Json -Compress | Set-Content -LiteralPath $Config.PidFile

  Write-Host "$($Config.DisplayName) started with PID $($process.Id)."
}

$config = Get-ServiceConfig -Name $Service

switch ($Action) {
  'start' {
    Start-TrackedProcess -Config $config
  }
  'stop' {
    Stop-TrackedProcess -Config $config
    Stop-ConflictingPortProcesses -Config $config
    Write-Host "$($config.DisplayName) stopped."
  }
}
