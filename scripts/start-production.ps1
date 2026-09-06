# SaphirCaisse — start local production server (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$Root\front\dist\index.html")) {
  Write-Host "Frontend not built. Run .\scripts\install-production.ps1 first." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "$Root\server\.env")) {
  Write-Host "Missing server\.env. Copy server\.env.production.example and configure it." -ForegroundColor Red
  exit 1
}

Set-Location $Root
Write-Host "Starting SaphirCaisse (production) on http://localhost:3000" -ForegroundColor Cyan
npm run start:prod
