# Despliega el worker livescore-relay en Railway (start command en railway.toml temporal).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$tomlBackup = $null
if (Test-Path "railway.toml") {
    $tomlBackup = "railway.toml.bak.deploy-relay"
    Copy-Item railway.toml $tomlBackup -Force
}

Copy-Item railway.livescore-relay.toml railway.toml -Force

try {
    Write-Host "Desplegando livescore-relay..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Variables requeridas en Railway (servicio livescore-relay):" -ForegroundColor Yellow
    Write-Host "  API_FOOTBALL_KEY, API_FOOTBALL_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL"
    Write-Host "  APIFOOTBALL_PILOT_LEAGUE_ID=3 (opcional en pilot)"
    Write-Host "  Copialas desde Mundial Compas Service o usa Shared Variables."
    Write-Host ""
    railway up --detach --service livescore-relay
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Listo. Logs: railway logs --service livescore-relay" -ForegroundColor Green
} finally {
    Remove-Item railway.toml -ErrorAction SilentlyContinue
    if ($tomlBackup -and (Test-Path $tomlBackup)) {
        Move-Item $tomlBackup railway.toml -Force
    }
}
