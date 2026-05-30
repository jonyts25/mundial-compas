# Relay local: sync env (app principal) + arrancar WebSocket
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

& "$PSScriptRoot/sync-env-from-railway.ps1" -ServiceName "Mundial Compas Service"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Iniciando livescore-relay (Ctrl+C para parar)..." -ForegroundColor Cyan
npm run livescore-relay
