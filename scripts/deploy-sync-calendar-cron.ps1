$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$tomlBackup = $null
if (Test-Path "railway.toml") {
    $tomlBackup = "railway.toml.bak.deploy-calendar-cron"
    Copy-Item railway.toml $tomlBackup -Force
}

Copy-Item railway.sync-calendar-cron.toml railway.toml -Force

try {
    Write-Host "Desplegando sync-calendar-cron..." -ForegroundColor Cyan
    npx railway up --detach --service sync-calendar-cron
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Listo. Variables: API_SPORTS_LEAGUE_ID=1, API_SPORTS_SEASON=2026" -ForegroundColor Green
} finally {
    Remove-Item railway.toml -ErrorAction SilentlyContinue
    if ($tomlBackup -and (Test-Path $tomlBackup)) {
        Move-Item $tomlBackup railway.toml -Force
    }
}
