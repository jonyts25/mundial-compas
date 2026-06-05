# México vs Serbia — prueba EN VIVO

Amistoso internacional (FOX fixture `761641`). **No usar replay simulado** para este partido.

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
