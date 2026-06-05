# Prueba en vivo — México vs Serbia

Partido pilot `fixture_id=776604`. Si apifootball no devuelve el evento hoy, se carga directo en Supabase y el **runner** simula el partido vía webhook (goles, chat, push).

## Kickoff por defecto

**20:00 CDMX** del día actual. Ajusta con:

```env
MEXICO_SERBIA_KICKOFF_HOUR=20
MEXICO_SERBIA_KICKOFF_MINUTE=0
```

## Setup automático (recomendado)

```powershell
npm run setup-railway-mexico-serbia
```

Esto:

1. Activa `PILOT_MODE_ENABLED` en app + relay
2. Carga el partido en Supabase
3. Despliega la app
4. Despliega el runner en `livescore-relay` (espera kickoff → replay)

## Manual

```powershell
node scripts/cargar-pilot-mexico-serbia.mjs
node scripts/replay-mexico-serbia-live.mjs --reset
```

Forzar sin esperar kickoff:

```powershell
node scripts/run-mexico-serbia-live-runner.mjs --now
```

## Variables Railway

```env
PILOT_MODE_ENABLED=true
APIFOOTBALL_PILOT_LEAGUE_ID=776
APIFOOTBALL_PILOT_FROM=2026-06-04
APIFOOTBALL_PILOT_TO=2026-06-04
APIFOOTBALL_PILOT_LABEL=Mexico vs Serbia - partido de prueba
MEXICO_SERBIA_REPLAY_DELAY_MS=25000
```

Relay también necesita: `API_FOOTBALL_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Qué probar

- Home / quiniela: banderas México y Serbia
- Pronóstico antes del pitazo
- Chat en vivo: narración de goles (Lozano 23', Mitrović 67', Martín 82')
- Push de goles y final 2-1
- Leaderboard tras `Finished`

## Volver al relay normal

```powershell
npm run deploy:relay
```

Y restaura `APIFOOTBALL_PILOT_LEAGUE_ID` al pilot que uses (UCL `3`, Concacaf `5`, etc.).
