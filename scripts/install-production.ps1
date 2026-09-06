# SaphirCaisse — local production install (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> SaphirCaisse production install" -ForegroundColor Cyan
Set-Location $Root

Write-Host "==> Installing root dependencies..."
npm install

Write-Host "==> Installing server and frontend dependencies..."
npm run install:all

if (-not (Test-Path "$Root\server\.env")) {
  Write-Host "==> Creating server\.env from production example..."
  Copy-Item "$Root\server\.env.production.example" "$Root\server\.env"
  Write-Host "    Edit server\.env (DATABASE_URL, JWT secrets) before starting." -ForegroundColor Yellow
} else {
  Write-Host "==> server\.env already exists — keeping it."
}

Write-Host "==> Generating Prisma client..."
Push-Location "$Root\server"
npx prisma generate

Write-Host "==> Running database migrations..."
npx prisma migrate deploy
Pop-Location

Write-Host "==> Building frontend for production..."
npm run build

Write-Host ""
Write-Host "Install complete." -ForegroundColor Green
Write-Host "  1. Configure server\.env (MySQL, JWT secrets)"
Write-Host "  2. Seed if needed:  cd server && npm run seed"
Write-Host "  3. Start production: .\scripts\start-production.ps1"
Write-Host "  4. Open http://localhost:3000"
