# Cron de alineaciones (Railway)

## Opción A — Servicio cron en Railway (recomendado)

1. En el proyecto **Mundial-Compas**, clic **+ New** → **Empty Service** → nombre: `sync-lineups-cron`
2. Conecta el **mismo repo** / carpeta que la app.
3. **Settings → Deploy**:
   - **Start Command:** `node scripts/sync-lineups-cron.mjs`
   - **Cron Schedule:** `*/15 * * * *` (cada 15 min)
4. **Variables** (copia las de la app):
   - `ADMIN_CARGAR_PARTIDOS_SECRET`
   - `NEXT_PUBLIC_APP_URL=https://mundial-compas.up.railway.app`
5. Este servicio no necesita dominio público.

## Opción B — Manual antes del partido

```powershell
curl -X POST "https://mundial-compas.up.railway.app/api/admin/sync-lineups" `
  -H "Authorization: Bearer TU_ADMIN_CARGAR_PARTIDOS_SECRET"
```

O:

```powershell
npm run sync-lineups:cron
```
