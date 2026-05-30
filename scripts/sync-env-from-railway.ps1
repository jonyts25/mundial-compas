# Sincroniza variables de Railway -> .env.local (raiz del repo)
# Requisitos: railway login + railway link en esta carpeta
#
# Por defecto lee la app Next.js, NO el worker livescore-relay.
# Uso: powershell -File scripts/sync-env-from-railway.ps1
#      powershell -File scripts/sync-env-from-railway.ps1 -ServiceName livescore-relay

param(
    [string]$ServiceName = "Mundial Compas Service"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Error "Railway CLI no instalado. Ejecuta: npm install -g @railway/cli"
}

$whoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "No hay sesion en Railway. Ejecuta:" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor Cyan
    exit 1
}

$status = railway status 2>&1
if ($LASTEXITCODE -ne 0 -or $status -match "No linked project") {
    Write-Host "Proyecto no vinculado. Ejecuta en esta carpeta:" -ForegroundColor Yellow
    Write-Host "  cd $root" -ForegroundColor Cyan
    Write-Host "  railway link" -ForegroundColor Cyan
    exit 1
}

Write-Host "Servicio: $ServiceName" -ForegroundColor DarkGray
Write-Host "Descargando variables desde Railway..." -ForegroundColor Green

$maxRetries = 3
$kv = $null
for ($i = 1; $i -le $maxRetries; $i++) {
    $kv = railway variable list --service $ServiceName --kv 2>&1
    if ($LASTEXITCODE -eq 0 -and $kv -notmatch "Failed to fetch") {
        break
    }
    if ($i -lt $maxRetries) {
        Write-Host "Reintento $i/$maxRetries (error de red Railway)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}

if ($LASTEXITCODE -ne 0 -or $kv -match "Failed to fetch|error sending request") {
    Write-Host ""
    Write-Host "No se pudo conectar a Railway (backboard.railway.com)." -ForegroundColor Red
    Write-Host "Prueba:" -ForegroundColor Yellow
    Write-Host "  1. Reintenta el comando en unos segundos"
    Write-Host "  2. Desactiva VPN / revisa firewall o antivirus"
    Write-Host "  3. railway login"
    Write-Host "  4. Copia variables a mano desde railway.app (Mundial Compas Service -> Variables)"
    Write-Host ""
    Write-Host "Minimo para el relay local en .env.local:"
    Write-Host "  API_FOOTBALL_KEY, API_FOOTBALL_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL"
    exit 1
}

$lines = $kv -split "`n" | Where-Object { $_.Trim() -ne "" -and $_ -match "=" }
if ($lines.Count -lt 5) {
    Write-Host "Solo $($lines.Count) variables. Servicio correcto?" -ForegroundColor Yellow
    Write-Host "Usa: -ServiceName 'Mundial Compas Service'" -ForegroundColor Yellow
}

$envPath = Join-Path $root ".env.local"
if (Test-Path $envPath) {
    $backup = "$envPath.bak.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $envPath $backup
    Write-Host "Respaldo: $backup" -ForegroundColor DarkGray
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$header = @(
    "# Generado desde Railway ($ServiceName) - $timestamp"
    "# App produccion: https://mundial-compas.up.railway.app"
    ""
)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($envPath, [string[]]($header + $lines), $utf8NoBom)

Write-Host "Listo: $envPath" -ForegroundColor Green
Write-Host "Variables exportadas: $($lines.Count)" -ForegroundColor Green
Write-Host "Siguiente paso: npm run livescore-relay" -ForegroundColor Cyan
