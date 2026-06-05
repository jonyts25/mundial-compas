# Despliega el runner México vs Serbia en el servicio livescore-relay de Railway.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$tomlBackup = $null
if (Test-Path "railway.toml") {
    $tomlBackup = "railway.toml.bak.deploy-mx-srb"
    Copy-Item railway.toml $tomlBackup -Force
}

Copy-Item railway.mexico-serbia-runner.toml railway.toml -Force

try {
    Write-Host "Desplegando runner México vs Serbia (livescore-relay)..." -ForegroundColor Cyan
    npx railway up --detach --service livescore-relay
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Listo. Logs: npx railway logs --service livescore-relay" -ForegroundColor Green
} finally {
    Remove-Item railway.toml -ErrorAction SilentlyContinue
    if ($tomlBackup -and (Test-Path $tomlBackup)) {
        Move-Item $tomlBackup railway.toml -Force
    }
}
