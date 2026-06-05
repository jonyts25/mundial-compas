# Despliega sync-live-cron en Railway (Docker + schedule cada minuto).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$tomlBackup = $null
if (Test-Path "railway.toml") {
    $tomlBackup = "railway.toml.bak.deploy-sync-cron"
    Copy-Item railway.toml $tomlBackup -Force
}

Copy-Item railway.sync-live-cron.toml railway.toml -Force

try {
    Write-Host "Desplegando sync-live-cron..." -ForegroundColor Cyan
    npx railway up --detach --service sync-live-cron
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Listo. Logs: npx railway logs --service sync-live-cron" -ForegroundColor Green
} finally {
    Remove-Item railway.toml -ErrorAction SilentlyContinue
    if ($tomlBackup -and (Test-Path $tomlBackup)) {
        Move-Item $tomlBackup railway.toml -Force
    }
}
