# México vs Serbia — prueba EN VIVO

Amistoso internacional (FOX fixture `761641`). **No usar replay simulado** para este partido.

## Opción recomendada: api-sports.io (plan free)

Con cuenta en [dashboard.api-football.com](https://dashboard.api-football.com/) (mismo ecosistema, header `x-apisports-key`):

```env
FOOTBALL_DATA_PROVIDER=api-sports
API_SPORTS_KEY=tu_key_del_dashboard
API_SPORTS_PILOT_DATE=2026-06-04
API_SPORTS_PILOT_TEAM_ID=16
PILOT_MODE_ENABLED=true
APIFOOTBALL_PILOT_LABEL=Mexico_vs_Serbia_live
```

Spike (busca fixture id real):

```powershell
npm run discover-api-sports
```

Cargar en Supabase:

```powershell
npm run cargar-pilot-mexico-serbia
```

En vivo sin WebSocket — **polling** (1 req por sync, plan free ~100/día):

```powershell
# Manual cada ~60s durante el partido
curl -X POST "http://localhost:3000/api/admin/sync-live" -H "Authorization: Bearer $ADMIN_CARGAR_PARTIDOS_SECRET"

# O cron en Railway: npm run sync-live:cron
```

Setup automático en Railway:

```powershell
npm run setup-railway-api-sports
```

Variables en Railway: `FOOTBALL_DATA_PROVIDER=api-sports`, `API_SPORTS_KEY`, `API_SPORTS_PILOT_FIXTURE_ID=1528284`. Pausa `livescore-relay` (no aplica a api-sports). Cron: servicio `sync-live-cron` con `railway.sync-live-cron.toml`.

---

## Alternativa: apifootball.com (plan de pago)

## Requisito: plan apifootball

El relay en vivo solo recibe partidos que tu **plan en apifootball.com** incluye.

Diagnóstico:

```powershell
node scripts/discover-api-plan.mjs
```

Si solo ves 2 ligas menores (ej. Ghana PL, England Non League), **México vs Serbia no llegará por API**. Debes renovar/ampliar el plan en [apifootball.com](https://apifootball.com) para incluir amistosos internacionales.

## Setup en vivo (WebSocket)

```powershell
# Opcional: cuando tengas el league_id del amistoso en tu plan
$env:APIFOOTBALL_PILOT_LEAGUE_ID="XXXX"

npm run setup-railway-live
```

Esto:

1. Activa pilot en la app
2. Despliega `livescore-relay` (WebSocket → `/api/webhooks/football`)
3. **No** ejecuta payloads simulados

## Cargar partido en Supabase

Cuando el plan incluya el fixture:

```powershell
# Con league_id correcto en env
npm run cargar-pilot-mexico-serbia
```

O vía admin en producción:

```powershell
curl -X POST "https://mundial-compas.up.railway.app/api/admin/cargar-partidos?modo=pilot&from=2026-06-04&to=2026-06-04" `
  -H "Authorization: Bearer $ADMIN_CARGAR_PARTIDOS_SECRET"
```

## Logs

```powershell
npx railway logs --service livescore-relay
```

Debes ver: `[relay] Conectado a apifootball livescore` y posts cuando haya eventos en tu plan.

## Scripts de replay (solo emergencia)

Si la API no tiene el partido, **no** uses estos para un amistoso real:

- `npm run replay-mexico-serbia` — simulación manual
- `deploy:mexico-serbia-runner` — runner con payloads (desactivado)
