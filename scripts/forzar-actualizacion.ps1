# Forzar marcador en vivo en produccion (Champions / pilot)
#
# PASO 2 (despues del deploy):
#   cd D:\Proyectos\mundial-compas
#   npm run forzar-live
#
# Plan B si Railway devuelve 500 (actualiza Supabase desde tu PC):
#   npm run cargar-pilot
#   (requiere API_FOOTBALL_KEY valida en .env.local)
#
# Uso: powershell -ExecutionPolicy Bypass -File .\scripts\forzar-actualizacion.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Cargar .env.local
$envFile = Join-Path $root ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"').Trim("'")
            if (-not [string]::IsNullOrWhiteSpace($name)) {
                Set-Item -Path "env:$name" -Value $val
            }
        }
    }
}

$secret = $env:ADMIN_CARGAR_PARTIDOS_SECRET
$base = $env:NEXT_PUBLIC_APP_URL
if (-not $base) { $base = "https://mundial-compas.up.railway.app" }
$base = $base.TrimEnd("/")

if (-not $secret) {
    Write-Host "ERROR: No encuentro ADMIN_CARGAR_PARTIDOS_SECRET en .env.local" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $secret" }

Write-Host ""
Write-Host "=== Forzar actualizacion en vivo ===" -ForegroundColor Cyan
Write-Host "App: $base" -ForegroundColor DarkGray
Write-Host ""
Write-Host "=== 1/2 Recargar partido pilot (cargar-partidos) ===" -ForegroundColor Cyan
try {
    $r1 = Invoke-RestMethod -Method POST `
        -Uri "$base/api/admin/cargar-partidos?modo=pilot" `
        -Headers $headers
    $r1 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Fallo cargar-partidos: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalle:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host "=== 2/2 Sincronizar marcador en vivo (sync-live) ===" -ForegroundColor Cyan
try {
    $r2 = Invoke-RestMethod -Method POST `
        -Uri "$base/api/admin/sync-live?pilot=1" `
        -Headers $headers
    $r2 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Fallo sync-live: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalle:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message
    }
    Write-Host ""
    Write-Host "Si dice 404: el deploy aun no tiene sync-live. Corre: npx railway up --detach" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Listo. Refresca la app (cierra y abre la PWA)." -ForegroundColor Green
Write-Host "En Supabase, estatus deberia ser en_vivo si live=1 arriba." -ForegroundColor Green
