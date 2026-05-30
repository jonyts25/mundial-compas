# Livescore relay en Railway (WebSocket → webhook)

apifootball empuja cambios por **WebSocket** (`wss://wss.apifootball.com/livescore`). Este worker reenvía cada update a:

`POST https://mundial-compas.up.railway.app/api/webhooks/football`

## Servicio `livescore-relay`

| Campo | Valor |
|-------|--------|
| Tipo | Worker (proceso largo, **sin** cron) |
| Start command | `npm run start:relay` |
| Dominio público | No hace falta |

### Variables (mismas que la app)

Copia desde **Mundial Compas Service** o usa variables compartidas del proyecto:

- `API_FOOTBALL_KEY`
- `API_FOOTBALL_WEBHOOK_SECRET` (secret **real**, no placeholder)
- `NEXT_PUBLIC_APP_URL=https://mundial-compas.up.railway.app`
- `APIFOOTBALL_PILOT_LEAGUE_ID=5` (Concacaf) o `3` (UCL)
- `APIFOOTBALL_TIMEZONE=America/Mexico_City`

Automatizar (Concacaf final):

```powershell
npm run setup-railway-concacaf
powershell -ExecutionPolicy Bypass -File ./scripts/deploy-livescore-relay.ps1
```

Opcional: `WEBHOOK_RELAY_TARGET` si el POST debe ir a otra URL.

### Crear / desplegar (CLI)

```powershell
cd D:\Proyectos\mundial-compas

# 1. Crear servicio (una vez)
railway add --service livescore-relay

# 2. Start command en dashboard si no tomó railway.livescore-relay.toml:
#    Settings → Deploy → Custom Start Command → npm run start:relay

# 3. Variables (ejemplo secret nuevo — genera el tuyo)
railway variable set API_FOOTBALL_WEBHOOK_SECRET="TU_SECRET_LARGO" --service "Mundial Compas Service"
railway variable set API_FOOTBALL_WEBHOOK_SECRET="TU_SECRET_LARGO" --service livescore-relay

# 4. Desplegar solo el relay
railway up --detach --service livescore-relay
```

### Logs

```powershell
railway logs --service livescore-relay
```

Deberías ver: `[relay] Conectado a apifootball livescore` y líneas `match … → 200`.

## Mientras tanto: relay local

Con `.env.local` sincronizado:

```powershell
npm run livescore-relay
```

Deja la terminal abierta durante el partido. Ctrl+C para parar.

## Secret del webhook

Genera uno (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Ponlo en **ambos** servicios (app + relay) como `API_FOOTBALL_WEBHOOK_SECRET` y redeploy la app.
