param(
  [ValidateSet("status", "start", "stop", "restart")]
  [string]$Action = "status",

  [string]$Pattern = "actions.runner.PaladinGod8-verse-vault.*"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-RunnerServices {
  return Get-Service -Name $Pattern -ErrorAction SilentlyContinue | Sort-Object Name
}

function Show-RunnerServices {
  $servicesToShow = Get-RunnerServices

  if (-not $servicesToShow) {
    Write-Host "No runner services matched pattern: $Pattern" -ForegroundColor Yellow
    return
  }

  $servicesToShow | Format-Table Name, Status, StartType -AutoSize
}

function Ensure-Elevated {
  if (Test-IsAdministrator) {
    return $true
  }

  $hostExe = (Get-Process -Id $PID).Path
  $argList = @(
    "-NoProfile"
    "-ExecutionPolicy"
    "Bypass"
    "-File"
    "`"$PSCommandPath`""
    "-Action"
    $Action
    "-Pattern"
    "`"$Pattern`""
  )

  Write-Host "Requesting elevation..." -ForegroundColor Cyan
  Start-Process -FilePath $hostExe -Verb RunAs -ArgumentList $argList | Out-Null
  return $false
}

$services = Get-RunnerServices

if (-not $services) {
  Write-Host "No runner services matched pattern: $Pattern" -ForegroundColor Yellow
  exit 1
}

switch ($Action) {
  "status" {
    Show-RunnerServices
  }
  "start" {
    if (-not (Ensure-Elevated)) { exit 0 }

    $services | Where-Object Status -ne "Running" | Start-Service
    Show-RunnerServices
  }
  "stop" {
    if (-not (Ensure-Elevated)) { exit 0 }

    $services | Where-Object Status -eq "Running" | Stop-Service -Force
    Show-RunnerServices
  }
  "restart" {
    if (-not (Ensure-Elevated)) { exit 0 }

    $services | Where-Object Status -eq "Running" | Restart-Service -Force
    $services | Where-Object Status -ne "Running" | Start-Service
    Show-RunnerServices
  }
}
