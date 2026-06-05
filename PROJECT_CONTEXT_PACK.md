# PROJECT CONTEXT PACK — Mundial Compas

> Paquete de contexto para handoff a ChatGPT u otro asistente.  
> Repo: `https://github.com/jonyts25/mundial-compas` · Producción: `https://mundial-compas.up.railway.app`  
> Documentos relacionados: `FILE_TREE.md`, `DB_SCHEMA.md`, `CURRENT_ERRORS.md`, `CHANGELOG_RECENT.md`

---

## 1. Resumen ejecutivo

### Qué problema resuelve
**Mundial Compas** es una PWA de quiniela social para el Mundial FIFA 2026 (y pruebas en vivo con otras ligas). Permite a un grupo de amigos (“compas”) predecir marcadores, competir en un leaderboard, chatear durante partidos con narración estilo televisor mexicano/LATAM, y recibir notificaciones push de goles, fases y eventos VAR.

### Para quién es
- Grupo de amigos / liga informal que juega una quiniela del Mundial.
- Usuarios en México (timezone `America/Mexico_City`, narradores parodia TV Azteca/Televisa/ESPN LATAM).
- Opcional: modo “competencia honor” (`quiniela_paga`) con tablón de liquidación simbólico — **no es apuesta real**, es gamificación + acuerdo entre conocidos.

### Flujo principal del usuario
1. Registrarse / iniciar sesión (Supabase Auth, email).
2. Entrar a la **liga global** automáticamente (`Mundial Compas`).
3. Ver **home**: partidos del día, marcador en vivo, dato mamalón.
4. En **Quiniela**: guardar pronóstico por partido (bloqueo T-5 min antes del kickoff en UI; T-0 en BD).
5. Durante el partido: entrar a **detalle del partido** → chat en tiempo real + eventos VAR (goles, fases, penales).
6. Ver **Leaderboard** y **Posiciones** (tabla FIFA vía API).
7. Opcional: activar **push** (PWA), silenciar partido, chat general de liga.

### Qué ya funciona
| Área | Estado |
|------|--------|
| Auth email + callback + recuperar contraseña | ✅ (requiere `NEXT_PUBLIC_APP_URL` correcto) |
| Quiniela global, puntos automáticos al finalizar | ✅ |
| Carga partidos Mundial (`POST /api/admin/cargar-partidos`) | ✅ |
| Livescore webhook + relay WebSocket | ✅ |
| Chat partido + Realtime Supabase | ✅ |
| Chat general + trivia VAR | ✅ |
| Narración goles/rojas/fases/penales/VAR anulado | ✅ |
| Web Push + cola notificaciones | ✅ (con VAPID en Railway) |
| Modo pilot UCL/Concacaf | ✅ |
| Alineaciones (sync + UI colapsable) | ✅ parcial |
| Competencia honor + tablón liquidación | ✅ parcial |
| Ligas privadas (schema) | ⚠️ schema sí; UI mínima |

### Qué está incompleto, mockeado o pendiente
| Área | Estado |
|------|--------|
| Crear/unir ligas privadas desde UI | Pendiente / mínimo |
| Cuadro UI tanda de penales | **Congelado** — decisión: solo chat+push (opción A) |
| Fan-out chat a ligas privadas (solo liga global hoy) | Pendiente |
| `api-football/` handlers legados vs `apifootball/webhook/` | Duplicidad técnica |
| Moderación chat avanzada | Parcial |
| Tests automatizados | No hay suite CI |
| Migrar middleware → proxy (Next 16) | Warning build |

---

## 2. Stack técnico

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 16.2.6** (App Router, Turbopack) |
| UI | **React 19**, **Tailwind CSS 4** |
| BD + Auth + Realtime | **Supabase** (Postgres, RLS, Auth, Realtime) |
| Datos fútbol | **apifootball.com** (REST + WebSocket livescore) |
| Push | **web-push** + VAPID, PWA (`public/sw.js`, manifest) |
| Hosting | **Railway** — app Next.js + worker `livescore-relay` |
| Cron fallback | Scripts `sync-live-cron`, `sync-lineups-cron` en Railway |

### Variables de entorno (sin secretos reales)

Ver `.env.example` y `docs/RAILWAY_DEPLOY.md`.

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Cliente Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Cliente browser (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Webhooks, admin, server actions |
| `API_FOOTBALL_KEY` | Sí | API apifootball.com |
| `API_FOOTBALL_WEBHOOK_SECRET` | Sí | Bearer webhook + relay |
| `ADMIN_CARGAR_PARTIDOS_SECRET` | Sí | Admin cargar partidos |
| `NEXT_PUBLIC_APP_URL` | Sí prod | Auth redirects, VAPID subject |
| `APIFOOTBALL_LEAGUE_ID` | Mundial | `28` |
| `APIFOOTBALL_WORLD_CUP_FROM/TO` | Carga | Rango fechas |
| `APIFOOTBALL_TIMEZONE` | Sí | `America/Mexico_City` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push | |
| `VAPID_PRIVATE_KEY` | Push | |
| `VAPID_SUBJECT` | Push | mailto: o URL app |
| `PILOT_MODE_ENABLED` | Opcional | Banner pilot |
| `APIFOOTBALL_PILOT_LEAGUE_ID` | Pilot | ej. `3` UCL, `5` Concacaf |
| `APIFOOTBALL_PILOT_FROM/TO/LABEL` | Pilot | |
| `APP_MODERATOR_USER_IDS` | Opcional | UUIDs moderadores |
| `STANDINGS_CACHE_SECONDS` | Opcional | default 1800 |

**No commitear:** `.env.local`, claves reales, `API_FOOTBALL_WEBHOOK_SECRET` de producción.

### Cómo correr localmente

```bash
git clone https://github.com/jonyts25/mundial-compas.git
cd mundial-compas
npm install
cp .env.example .env.local
# Completar variables (Supabase + apifootball + secrets)

# Migraciones: supabase db push o SQL en dashboard

npm run dev          # http://localhost:3000
npm run livescore-relay   # terminal aparte — en vivo
npm run build && npm start
```

Scripts útiles: `npm run test-webhook`, `npm run cargar-pilot`, `npm run replay-penalties`.

---

## 3. Estructura del repo

### Carpetas principales

| Ruta | Rol |
|------|-----|
| `src/app/(app)/` | Páginas autenticadas: home, quiniela, partido, leaderboard |
| `src/app/(auth)/` | Login, callback OAuth/email, password reset |
| `src/app/api/` | Route handlers: webhooks, admin, push |
| `src/lib/apifootball/webhook/` | **Corazón en vivo** — normalize, process, penales |
| `src/lib/partidos/` | Queries, reloj, sync live/lineups |
| `src/lib/narracion/` | Plantillas comentaristas (MX, ES, VAR) |
| `src/components/` | UI por feature |
| `supabase/migrations/` | Schema versionado |
| `scripts/` | Relay, carga pilot, cron, utilidades |
| `docs/` | Deploy Railway, pilot, push |

### Archivos críticos

| Archivo | Por qué |
|---------|---------|
| `src/lib/apifootball/webhook/process.ts` | Procesa cada update livescore |
| `src/lib/apifootball/webhook/normalize.ts` | Payload → eventos |
| `src/lib/partidos/match-clock.ts` | Periodos HT/TE/penales |
| `src/lib/constants.ts` | `LIGA_GLOBAL_ID` |
| `src/middleware.ts` | Auth guard |
| `scripts/apifootball-livescore-relay.mjs` | WS → webhook |
| `supabase/migrations/20260518000001_initial_schema.sql` | Schema base |

### NO tocar sin cuidado

| Archivo / área | Riesgo |
|----------------|--------|
| `supabase/migrations/*` ya aplicadas en prod | No editar; crear nueva migración |
| `LIGA_GLOBAL_ID` en constants + seed SQL | Desincronía rompe chat/pronósticos |
| `src/lib/supabase/admin.ts` | Service role — seguridad |
| Triggers `pronosticos` / `recalcular_puntos` | Lógica de puntos en BD |
| `.env.local` / secrets Railway | Filtración |
| `webhook_eventos` idempotencia | Duplicados si se cambia `eventKey` |

---

## 4. Modelo de datos

Ver **`DB_SCHEMA.md`** completo.

**Resumen relaciones:**

```
auth.users 1──1 usuarios
usuarios N──M ligas_privadas (liga_miembros)
ligas_privadas 1──N pronosticos
partidos 1──N pronosticos, mensajes_chat, notificaciones
usuarios 1──N push_subscriptions, push_partidos_silenciados
ligas_privadas 1──N liquidacion_pagos
```

---

## 5. Flujos de usuario

### Registro / login
1. `/login` — email + password o magic link (Supabase).
2. `/callback` — intercambia code, redirige a `next` o `/`.
3. Trigger `handle_new_user` crea fila `usuarios` + miembro liga global.
4. `/recuperar-contrasena` → email con link a `/actualizar-contrasena` (requiere Site URL prod).

### Onboarding
- No hay wizard multi-paso formal.
- `PendingHonorTermsApplier` puede pedir términos honor si aplica `quiniela_paga`.
- `PushNotificationPrompt` ofrece activar notificaciones (PWA).

### Flujo principal
```
Home → elegir partido → Pronóstico (quiniela o reminder en partido)
     → Partido en vivo → Chat + marcador live
     → Leaderboard / Posiciones
     → Chat general (liga)
```

### Pantallas

| Ruta | Componentes clave |
|------|-------------------|
| `/` | `HeroSection`, `CalendarioPartidos`, `PilotModeBanner` |
| `/quiniela` | `QuinielaList`, `PronosticoRow`, honor/liquidación |
| `/partidos/[id]` | `PartidoHeader`, `ChatPartido`, `PartidoAlineaciones` |
| `/leaderboard` | `Leaderboard` |
| `/posiciones` | `GroupStandings` |
| `/chat-general` | `ChatGeneral` |

### Estados vacíos / loading / errores
- Home sin partidos: calendario vacío.
- Quiniela: filtros “pendientes / guardados / cerrados”.
- Chat: carga inicial server + Realtime subscription.
- Pronóstico: mensaje si locked (T-5).
- Auth: errores en query `?error=auth_callback`.

### Roles
| Rol | Capacidades |
|-----|-------------|
| `miembro` (default) | Quiniela, chat, push |
| `owner` / `admin` liga | Schema; UI limitada |
| Moderador app (`APP_MODERATOR_USER_IDS`) | Chat moderación, acuerdo paga |
| Service role (servidor) | Webhooks, bypass RLS |

No hay rol “admin UI” completo en frontend.

---

## 6. Estado actual del MVP

| Feature | Estado | Archivos | Riesgos / deuda |
|---------|--------|----------|-----------------|
| Auth Supabase | Funcionando | `(auth)/*`, `middleware.ts` | Redirect URLs localhost vs prod |
| Quiniela + puntos | Funcionando | `quiniela/*`, triggers SQL | UI T-5 vs BD T-0 |
| Carga partidos API | Funcionando | `api/admin/cargar-partidos` | Timezone kickoff |
| Livescore webhook | Funcionando | `webhook/*`, relay script | Relay debe estar siempre on |
| VAR gol anulado | Funcionando (nuevo) | `goal-sync.ts`, `process.ts` | Depende de goalscorer API |
| Fases partido (HT, 2T, TE) | Parcial/mejorado | `match-clock.ts` | API salta estados |
| Penales chat+push | Funcionando | `penalty-shootout.ts` | Sin UI cuadro (decisión A) |
| Web Push PWA | Parcial | `push/*`, `sw.js` | iOS requiere install |
| Chat partido Realtime | Funcionando | `ChatPartido.tsx` | Solo liga global eventos |
| Chat general | Funcionando | `chat-general/*` | |
| Datos mamalones | Funcionando | seeds, `pick.ts` | |
| Pilot mode | Funcionando | `pilot-config.ts` | No mezclar con mundial |
| Alineaciones | Parcial | `sync-lineups`, `PartidoAlineaciones` | Lint hooks issues |
| Posiciones FIFA | Funcionando | `fetch-standings` | Cache 30 min |
| Competencia honor | Parcial | `TablonLiquidacion`, RPC | Hooks condicionales (lint error) |
| Ligas privadas UI | Pendiente | schema only | |
| Tests E2E | Pendiente | — | |
| api-football legado | Parcial | `src/lib/api-football/` | Duplicado con apifootball |

---

## 7. Cambios recientes

Ver **`CHANGELOG_RECENT.md`**.

**Último commit:** `af7dca1` — VAR, fases, relay status.

**Bugs corregidos recientemente:**
- Horarios Mundial ~8h desfase (kickoff CDMX).
- Password reset a localhost.
- Webhook secret placeholder.
- Medio tiempo / TE no detectados.
- Throttle relay perdía `Half Time`.

**Bugs conocidos:**
- `TablonLiquidacion.tsx` — hooks después de return.
- Lint `set-state-in-effect` en varios componentes.
- `sync-lineups-cron.mjs` parsing error.

**Decisiones técnicas:**
- apifootball **no** POSTea HTTP; relay WS → `/api/webhooks/football`.
- Secret webhook es **interno**, no panel apifootball.
- Penales: opción A (sin UI cuadro).
- Narración: parodias MX, **sin Marion Reimers** (pedido explícito usuario).
- Idempotencia: `webhook_eventos` + `eventKey` por fixture.

---

## 8. Roadmap actual

### Qué sigue (sugerido)
- Validar en partido real: HT, 2T, TE, VAR, penales.
- Corregir `TablonLiquidacion` hooks.
- Aplicar migración `20260531120000` en prod si falta.
- Reducir deuda lint React 19.

### Congelado
- UI cuadro de penales (opción A confirmada).
- Ligas privadas multi-tenant UI.

### No hacer todavía
- Reescribir todo a otro proveedor API sin plan.
- Commitear `.env.local` o secrets.
- Editar migraciones ya aplicadas in-place.

---

## 9. Archivos clave (contenido)

### `package.json`

```json
{
  "name": "mundial-compas",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -H 0.0.0.0",
    "start:relay": "node scripts/apifootball-livescore-relay.mjs",
    "lint": "eslint",
    "sync-lineups:cron": "node scripts/sync-lineups-cron.mjs",
    "sync-live:cron": "node scripts/sync-live-cron.mjs",
    "cargar-pilot": "node scripts/cargar-pilot-local.mjs",
    "test-webhook": "node scripts/test-webhook.mjs",
    "livescore-relay": "node scripts/apifootball-livescore-relay.mjs"
  },
  "dependencies": {
    "@supabase/ssr": "^0.10.3",
    "@supabase/supabase-js": "^2.106.0",
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "web-push": "^3.6.7"
  }
}
```

### `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "flagcdn.com", pathname: "/**" },
      { protocol: "https", hostname: "apiv3.apifootball.com", pathname: "/badges/**" },
    ],
  },
};

export default nextConfig;
```

### `src/lib/env.ts`

```typescript
export function getServerEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    apiFootballWebhookSecret: required("API_FOOTBALL_WEBHOOK_SECRET"),
    apiFootballWebhookSignatureHeader:
      optional("API_FOOTBALL_WEBHOOK_SIGNATURE_HEADER") ?? "x-api-football-signature",
  };
}

export function getApiFootballEnv() {
  return {
    apiKey: trimEnv(required("API_FOOTBALL_KEY")),
    baseUrl: trimEnv(optional("API_FOOTBALL_BASE_URL") ?? "https://apiv3.apifootball.com/"),
    leagueId: optional("APIFOOTBALL_LEAGUE_ID")?.trim(),
    worldCupFrom: optional("APIFOOTBALL_WORLD_CUP_FROM") ?? "2026-06-01",
    worldCupTo: optional("APIFOOTBALL_WORLD_CUP_TO") ?? "2026-07-31",
    timezone: optional("APIFOOTBALL_TIMEZONE") ?? "America/Mexico_City",
  };
}
```

### `src/lib/constants.ts`

```typescript
export const LIGA_GLOBAL_ID = "a0000000-0000-4000-8000-000000000001";
export const LIGA_GLOBAL_SLUG = "mundial-compas";
export const TERMINOS_HONOR_VERSION = "2026-05-18-v1";
```

### Supabase clients

Ver archivos completos en repo:
- `src/lib/supabase/server.ts` — SSR cookies
- `src/lib/supabase/client.ts` — browser
- `src/lib/supabase/admin.ts` — service role
- `src/lib/supabase/middleware.ts` — session refresh

### Rutas App Router

| Método | Ruta | Handler |
|--------|------|---------|
| GET/POST | `/api/webhooks/football` | Livescore principal |
| POST | `/api/webhooks/api-football` | Legado API-Sports style |
| POST | `/api/admin/cargar-partidos` | Carga fixtures |
| POST | `/api/admin/sync-live` | Polling fallback |
| POST | `/api/admin/sync-lineups` | Alineaciones |
| GET | `/api/push/vapid-public-key` | Clave pública |
| POST | `/api/push/subscribe` | Suscripción |
| POST | `/api/push/partidos/[id]/silenciar` | Mute |

### Migraciones Supabase

17 archivos en `supabase/migrations/` — **esquema completo en `DB_SCHEMA.md`**.  
No pegar aquí los ~2000 líneas SQL; leer migraciones en orden por timestamp.

### Webhook pipeline (resumen código)

```
apifootball WS → scripts/apifootball-livescore-relay.mjs
              → POST /api/webhooks/football (Bearer secret)
              → processFootballWebhook()
              → normalizeLivePayload() → eventos
              → mensajes_chat (liga global) + notificaciones + push
              → update partidos (marcador, reloj, metadata)
```

Archivo principal: `src/lib/apifootball/webhook/process.ts` (~650 líneas).

### Componentes flujo crítico

- `src/components/partidos/ChatPartido.tsx` — chat Realtime partido
- `src/components/quiniela/PronosticoRow.tsx` — guardar pronóstico
- `src/components/home/MarcadorLive.tsx` — polling/refresco marcador
- `src/components/push/PushNotificationPrompt.tsx` — opt-in push

---

## 10. Preguntas abiertas

Cosas que **no** están en el repo o son ambiguas — conviene confirmar con el dueño del producto:

1. **¿Ligas privadas entran al MVP del Mundial o solo liga global?** Schema listo; UI casi ausente.
2. **Monto / reglas exactas de `quiniela_paga`** — ¿solo badge o hay flujo de pago real fuera de app?
3. **¿Cuántos moderadores y qué pueden borrar?** `APP_MODERATOR_USER_IDS` no está documentado en prod.
4. **Plan de carga partidos en producción** — ¿cron diario, manual antes del mundial, o ambos?
5. **Límite de usuarios / costo apifootball** — plan API y rate limits no documentados.
6. **¿Se usará dominio custom** además de `mundial-compas.up.railway.app`?
7. **Política de retención chat** — migración 24h: ¿activa en prod?
8. **¿Fan-out eventos VAR a ligas privadas** es requisito o nice-to-have?
9. **Criterio exacto T-5 vs T-0** — ¿unificar en BD o mantener diferencia UX?
10. **Estado migraciones prod** — ¿`20260531120000` aplicada en Supabase remoto? (usuario dijo sí en sesión anterior; verificar).
11. **Contenido legal** — versión términos honor y si requiere abogado antes de escalar usuarios.
12. **Idioma único español MX** — ¿LATAM neutro o más países en narración?
13. **Analytics / métricas** — no hay integración visible (PostHog, etc.).
14. **Backup y restore Supabase** — procedimiento no documentado en repo.

---

*Generado para handoff. Actualizar tras cambios mayores en `master`.*
