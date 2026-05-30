# Prueba en vivo — Final Concacaf Champions (Toluca vs Tigres)

Partido en apifootball: **fixture `763656`**, league_id **`5`**, hoy **18:00 CDMX**.

## 1. Cargar el partido (ya hecho si corriste el script)

```powershell
node scripts/cargar-pilot-concacaf.mjs
```

Queda con `metadata.competencia = "pilot"`, `fase = final` y escudos en metadata.

## 2. Variables Railway (app + relay)

Configuración automática:

```powershell
npm run setup-railway-concacaf
powershell -ExecutionPolicy Bypass -File ./scripts/deploy-livescore-relay.ps1
```

O manual en **Mundial Compas Service** y **livescore-relay**:

```env
PILOT_MODE_ENABLED=true
APIFOOTBALL_PILOT_LEAGUE_ID=5
APIFOOTBALL_PILOT_FROM=2026-05-30
APIFOOTBALL_PILOT_TO=2026-05-30
APIFOOTBALL_PILOT_LABEL=Concacaf Champions — Final Toluca vs Tigres
```

El relay filtra por `league_id`; con `5` escucha Concacaf (no UCL).

## 3. Relay en vivo (solo Railway — apaga la PC)

El worker **`livescore-relay`** en Railway ya escucha `league_id=5`. **No** corras `npm run livescore-relay` en local a la vez (duplicaría eventos).

Logs:

```powershell
npx railway logs --service livescore-relay
```

Debes ver: `Conectado a apifootball livescore` y `league_id=5`.

## 4. Qué probar

- Escudos Toluca / Tigres en home, quiniela y detalle del partido
- Push: goles, penales, fallos, final con campeón (`fase=final`)
- Chat VAR y quiniela (misma lógica que el pilot UCL)

## 5. Volver a UCL después

Cambia `APIFOOTBALL_PILOT_LEAGUE_ID=3` y las fechas del fin de semana UCL.
