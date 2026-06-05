# Changelog reciente — Mundial Compas

Commits relevantes en `master` (más reciente primero).

---

## `af7dca1` — Fix live phase notifications and VAR goal reversals

**Fecha aprox.:** mayo 2026 (sesión actual)

### Añadido
- Detección de **gol anulado por VAR**: baja de marcador o desaparición en `goalscorer[]` → chat jocoso + push `gol_anulado`.
- Fase **`regulation_end`**: fin del 90' empatado en eliminatoria → aviso de tiempo extra.
- Periodo **`BRK_REG`**: descanso entre 90' y TE (no confundir con medio tiempo).
- Transiciones compuestas: si la API salta `1H → 2H` por minuto, emite medio tiempo + inicio 2.º tiempo.
- `src/lib/apifootball/webhook/goal-sync.ts` — huella de goles y cancelaciones.
- Migración `20260531120000_notificacion_var_y_fin_reglamento.sql`.

### Corregido
- Relay: reenvía siempre cuando cambia `match_status` (no pierde `Half Time` por throttle 500 ms).
- `resolveMatchPeriod` / `mapApifootballLiveStatus`: mejor lectura de `Break Time`, `Half Time`, TE y penales.

### Decisión de producto
- **Penales:** opción A — solo chat + push; **sin** cuadro UI de tanda.

---

## `f1b9774` — Add per-match push mute toggle

- Toggle silenciar notificaciones por partido en vistas de juego.
- Tabla `push_partidos_silenciados` + API `/api/push/partidos/[id]/silenciar`.

---

## `116754e` — Add live pilot, push notifications, and webhook penalty flow

- PWA Web Push (VAPID), suscripciones, cola `notificaciones`.
- Webhook apifootball vía relay WebSocket → `POST /api/webhooks/football`.
- Narración VAR, goles, rojas, fases, penales en chat liga global.
- Modo pilot (UCL/Concacaf) con `metadata.competencia = "pilot"`.
- Reloj de partido (`metadata.reloj`), sync-live y sync-lineups cron.
- Chat general, liquidación honor, ganador inalcanzable.

---

## `66ef2e6` — Primer commit

- Schema Supabase, quiniela global, auth, home, partidos, pronósticos.

---

## Pendiente de commit (working tree)

- `package-lock.json` modificado
- `scripts/check-db-migrations.mjs` sin trackear
