# Despliega sync-lineups-cron en Railway (cron cada 15 min).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$tomlBackup = $null
if (Test-Path "railway.toml") {
    $tomlBackup = "railway.toml.bak.deploy-lineups-cron"
    Copy-Item railway.toml $tomlBackup -Force
}

Copy-Item railway.sync-lineups-cron.toml railway.toml -Force

try {
    Write-Host "Desplegando sync-lineups-cron..." -ForegroundColor Cyan
    npx railway up --detach --service sync-lineups-cron
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Listo. Logs: npx railway logs --service sync-lineups-cron" -ForegroundColor Green
} finally {
    Remove-Item railway.toml -ErrorAction SilentlyContinue
    if ($tomlBackup -and (Test-Path $tomlBackup)) {
        Move-Item $tomlBackup railway.toml -Force
    }
}
