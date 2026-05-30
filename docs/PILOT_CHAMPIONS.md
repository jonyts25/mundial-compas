# Fin de semana de prueba — Champions League

Prueba en vivo el chat por partido, mensajes VAR/jocosos del webhook, quiniela y cola de notificaciones **sin mezclar lógica del Mundial** (los partidos de prueba llevan `metadata.competencia = "pilot"`).

## Complejidad (resumen)

| Funcionalidad | Estado | Esfuerzo extra |
|---------------|--------|----------------|
| Cargar partidos UCL | Listo (`?modo=pilot`) | ~5 min configuración |
| Quiniela + lock T-5 | Ya funciona | Ninguno |
| Chat partido (T-10) | Ya funciona | Ninguno |
| Chat general + VAR trivia | Ya funciona | Ninguno |
| Mensajes webhook (gol, roja, fases) | Ya funciona si el relay apifootball apunta a tu URL | Config panel apifootball |
| Notificaciones en BD | Cola al gol (webhook) | Push al teléfono: **no hay worker** aún |
| Posiciones `/posiciones` | Mundial (league 28) | No aplica a UCL en esta prueba |

**Tiempo realista:** medio día para cargar, probar con el grupo y ajustar fechas; 1–2 días si quieres push nativo (FCM/Web Push + worker).

## 1. Variables en Railway / `.env.local`

```env
PILOT_MODE_ENABLED=true
APIFOOTBALL_PILOT_FROM=2026-05-23
APIFOOTBALL_PILOT_TO=2026-05-25
# Opcional si el autodetect falla:
# APIFOOTBALL_PILOT_LEAGUE_ID=...
APIFOOTBALL_PILOT_LABEL=Champions League — prueba con los compas
```

## 2. Descubrir `league_id` de Champions

```bash
curl -X POST "https://TU-DOMINIO/api/admin/cargar-partidos?diagnostic=leagues&search=champions" \
  -H "Authorization: Bearer TU_ADMIN_CARGAR_PARTIDOS_SECRET"
```

Copia el `league_id` del primer candidato a `APIFOOTBALL_PILOT_LEAGUE_ID` si hace falta.

## 3. Cargar partidos del fin de semana

```bash
curl -X POST "https://TU-DOMINIO/api/admin/cargar-partidos?modo=pilot" \
  -H "Authorization: Bearer TU_ADMIN_CARGAR_PARTIDOS_SECRET"
```

Respuesta esperada: `modo: "pilot"`, `upserted: N`.

## 4. Livescore en vivo (WebSocket relay)

apifootball **no** hace POST HTTP a tu servidor. El push en tiempo real va por **WebSocket**:

`wss://wss.apifootball.com/livescore?APIkey=...`

Tu endpoint `/api/webhooks/football` recibe el JSON **si un relay** lo reenvía. Opciones:

### A) Relay en Railway (recomendado para el pilot)

1. Genera un secret real (no el placeholder):

```powershell
railway variables set API_FOOTBALL_WEBHOOK_SECRET="(openssl rand -hex 32 o password largo)"
```

2. Segundo servicio en Railway (mismo repo), **Start command**:

```bash
node scripts/apifootball-livescore-relay.mjs
```

Variables: las mismas que la app (`API_FOOTBALL_KEY`, `API_FOOTBALL_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `APIFOOTBALL_PILOT_LEAGUE_ID=3`).

3. Prueba local:

```powershell
npm run livescore-relay
```

### B) Polling fallback (sin goles automáticos en chat)

Cron cada minuto: `node scripts/sync-live-cron.mjs` — actualiza marcador, **no** encola goles/push.

### C) Probar el endpoint HTTP

```powershell
npm run test-webhook
```

URL: `https://TU-DOMINIO/api/webhooks/football`  
Auth: `Authorization: Bearer <API_FOOTBALL_WEBHOOK_SECRET>`

## 5. Qué probar con el grupo

1. **Home** — banner ámbar + partidos con etiqueta «Prueba».
2. **Quiniela** — pronósticos hasta T-5 antes del pitido.
3. **Partido** (`/partidos/[id]`) — chat desde 10 min antes; mensajes en vivo.
4. **Chat general** — conversación de liga + trivia VAR en días sin partidos del Mundial.
5. **Notificaciones** — push al teléfono si activaste la PWA y corre el relay livescore (o webhook con payload de gol).

## 6. Después del fin de semana

- Pon `PILOT_MODE_ENABLED=false` (oculta el banner).
- Opcional en SQL: borrar partidos pilot si no los quieres en calendario:

```sql
DELETE FROM partidos WHERE metadata->>'competencia' = 'pilot';
```

(Los pronósticos/chat ligados pueden requerir borrado en cascada según FKs.)

## Notas

- Los partidos del Mundial **no se borran** al cargar pilot; conviven en el calendario.
- `/posiciones` sigue mostrando el Mundial (league 28), no la Champions.
