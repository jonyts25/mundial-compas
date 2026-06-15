# MOBILE-FIRST ECOSYSTEM PLAN

> **Estado:** Plan estratégico post-Migration 0. Sin implementación en este documento.

**Fecha:** 2026-06-15  
**Contexto:** Mundial Compas evoluciona hacia Sports Core compartido; nuevos productos mobile-first: **La Quiniela** y **LigaPro**.

---

## 1. Decisión estratégica

**Mundial Compas NO desaparece.** Se convierte en el producto flagship del ecosistema con presencia en:

| Superficie | Rol |
|------------|-----|
| **Web** (Next.js PWA actual) | Torneo Mundial, quiniela social, chat, Pitoniso |
| **iOS / Android** (futuro) | Misma propuesta de valor, UX nativa mobile-first |

**La Quiniela** y **LigaPro** nacen **después**, reutilizando Sports Core + Supabase, con adapters y branding propios.

---

## 2. Arquitectura objetivo

```
                    ┌─────────────────────────────────┐
                    │         Sports Core             │
                    │  matches · seasons · standings│
                    │  predictions · profiles       │
                    └───────────────┬─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ Mundial Compas│         │  La Quiniela  │         │    LigaPro    │
│ Web + Mobile  │         │    Mobile     │         │    Mobile     │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Supabase (único)        │
                    │   Auth · Postgres · Realtime│
                    │   Edge Functions · Storage  │
                    └───────────────────────────┘
```

### Backend (fase actual → futuro cercano)

| Decisión | Elección |
|----------|----------|
| Base de datos | **Supabase único** (multi-producto vía `competitions` / `seasons` / pools) |
| Repositorio | **Mismo repo** por ahora; evaluar monorepo en fase 3 |
| Lógica compartida | **`src/lib/sports-core/`** + adapters por producto |
| Auth | Supabase Auth compartido; perfiles app por producto |

---

## 3. Opciones de stack mobile — comparativa

### Opción 1: Next.js + Expo (apps separadas)

```
mundial-compas/     → Next.js web (actual)
la-quiniela-app/    → Expo (repo aparte)
ligapro-app/        → Expo (repo aparte)
```

| Criterio | Evaluación |
|----------|------------|
| Complejidad | **Baja** — equipos independientes |
| Velocidad inicial | **Alta** — scaffold Expo rápido |
| Costo infra | **Medio** — 3 deploys, 1 Supabase |
| Mantenimiento | **Alto** — duplicar fixes Sports Core en 3 repos |

### Opción 2: Next.js + Expo Router + shared package (recomendada fase 2)

```
mundial-compas/
├── apps/web/              → Next.js
├── apps/mundial-mobile/   → Expo Router
├── packages/sports-core/  → TS puro (extract de src/lib/sports-core)
└── packages/shared-ui/    → tokens, hooks opcionales
```

| Criterio | Evaluación |
|----------|------------|
| Complejidad | **Media** — setup monorepo (Turborepo/pnpm workspaces) |
| Velocidad inicial | **Media** — migración incremental del core |
| Costo infra | **Medio-bajo** — builds EAS por app |
| Mantenimiento | **Bajo-medio** — una fuente de verdad Sports Core |

### Opción 3: Monorepo futuro completo

Incluye La Quiniela + LigaPro como apps adicionales bajo `apps/*`.

| Criterio | Evaluación |
|----------|------------|
| Complejidad | **Alta** — CI, versioning, releases coordinados |
| Velocidad inicial | **Baja** — overhead setup |
| Costo infra | **Medio** — EAS multi-app |
| Mantenimiento | **Bajo** a escala (3+ productos) |

### Recomendación

| Fase | Stack |
|------|-------|
| **Ahora → Migration 0 + SC-5** | Opción 1 mental (solo web); extraer Sports Core en repo actual |
| **Mundial Compas Mobile v1** | **Opción 2** — un monorepo ligero con `packages/sports-core` |
| **La Quiniela + LigaPro** | Opción 3 — apps bajo mismo monorepo |

---

## 4. Mundial Compas Mobile v1 — pantallas

| Pantalla | Descripción | Reutilizable del web |
|----------|-------------|----------------------|
| **Login** | Supabase magic link / OAuth | `login/page.tsx`, auth callback |
| **Home** | Resumen + carrusel quinielas | `HomeEngagementDashboard`, `MultiQuinielaSummaryCarousel` |
| **Mis quinielas** | Lista global + grupos | `fetchHomeQuinielaSummaries`, `/quiniela`, `/grupos` |
| **Grupo** | Dashboard grupo privado | `/grupos/[slug]` |
| **Partido** | Header, Pitoniso, pronóstico multi-liga, chat | `/partidos/[id]`, `PartidoPronosticoPitonisoBlock` |
| **Pitoniso** | Señales pre-partido | `PitonisoCard`, `match-preview`, `pitoniso-message` |
| **Leaderboard** | Global + por grupo | `Leaderboard`, RPC `tabla_liderato_quiniela` |
| **Perfil** | Perfil jugador, stats | `UserStyleCard`, `fetchUserProfile` |

### Reutilización directa (Sports Core / queries)

| Módulo web | Uso mobile |
|------------|------------|
| `src/lib/sports-core/*` | 100% portable (TS puro) |
| `src/lib/home/home-dashboard-queries.ts` | Adaptar a Supabase client RN |
| `src/lib/queries/partido-quiniela-contexts.ts` | Idem |
| `src/lib/quiniela/save-pronostico` | Server action → Edge Function o RPC |
| `src/lib/partidos/pitoniso-signals.ts` | Portable |
| `src/lib/analytics/events.ts` | PostHog RN SDK |

### Rehacer en mobile (UI nativa)

- Navegación (tabs + stack)
- Carrusel horizontal (FlatList / FlashList)
- Chat realtime (Supabase Realtime RN)
- Push (Expo Notifications vs Web Push actual)
- Safe area / notch (ya resuelto en web recientemente)

---

## 5. La Quiniela Mobile — pantallas y diferencias

| Pantalla | Foco |
|----------|------|
| **Home** | Competición activa, CTA pronosticar |
| **Competiciones** | Selector multi-torneo (Liga MX, Champions, etc.) |
| **Quinielas** | Pools del usuario por competición |
| **Partido** | Pronóstico + agregados multitud |
| **Leaderboard** | Por pool / jornada |
| **Perfil** | Estilo jugador, historial |

### Diferencias vs Mundial Compas

| Aspecto | Mundial Compas | La Quiniela |
|---------|----------------|-------------|
| Competición | Mundial 2026 (single focus) | **Multi-competición** desde día 1 |
| Social | Grupos privados + chat partido | Pools + chat opcional (lighter) |
| Pitoniso | Feature flagship | Opcional / premium |
| Branding | Mundial, MX, compas | Genérico quiniela |
| Onboarding | Honor terms, liga global | Elegir competición → unirse pool |
| Datos | `season_id` WC 2026 default | **Selector season** obligatorio |

**Dependencias Sports Core:** Migration 0 + Migration 1 (`rounds`, pools por season) + UI multi-competición.

---

## 6. LigaPro Mobile — pantallas mobile-first

| Pantalla | Descripción |
|----------|-------------|
| **Dashboard liga** | Resumen jornada, próximo partido |
| **Captura resultado** | Admin anota marcador en cancha |
| **Eventos partido** | Goles, tarjetas, cambios en vivo |
| **Tabla** | Standings amateur |
| **Goleadores** | Ranking anotadores |
| **Equipo** | Plantel, stats |
| **Jugador** | Ficha individual |

### Mobile-first desde día 1

- **Captura resultado** — cámara, voz, inputs grandes ( uso en cancha )
- **Modo offline** — cola de eventos sync al reconectar
- **Roles** — admin liga vs jugador vs árbitro
- **Notificaciones** — gol, inicio partido, recordatorio captura
- **Geolocalización opcional** — verificar sede (fase 2)

**Dependencias Sports Core:** Migration 2+ (teams, players, amateur entities) — fuera de Migration 0.

---

## 7. Push Notifications — evaluación

| Opción | Pros | Contras |
|--------|------|---------|
| **Expo Notifications** | Integración nativa iOS/Android; tokens FCM/APNs; funciona con EAS | Requiere Edge Function para enviar; no reemplaza Web Push PWA |
| **Supabase Edge Functions** | Mismo backend; lógica push centralizada; ya hay pipeline notificaciones | Hay que adaptar de Web Push (VAPID) a FCM/APNs |
| **OneSignal** | Dashboard, segmentación, A/B | Costo; vendor lock-in; duplica `notificaciones` table logic |

### Recomendación

| Producto | Push |
|----------|------|
| **Mundial Compas Web** | Mantener Web Push actual (VAPID) |
| **Mundial Compas Mobile + La Quiniela + LigaPro** | **Expo Notifications** + **Supabase Edge Function** que lea `notificaciones` / eventos y envíe vía FCM/APNs |
| **Fase 2 escala** | Evaluar OneSignal si marketing/segmentación crece |

Tabla `push_subscriptions` actual es Web Push — Migration futura: `push_device_tokens` (platform, expo_push_token, user_id).

---

## 8. Roadmap

| # | Fase | Entregable | Dependencias |
|---|------|------------|--------------|
| 1 | **Pilot cleanup** | BD sin partidos pilot | `PILOT_CLEANUP_*` |
| 2 | **Migration 0** | `competitions`, `seasons`, `partidos.season_id` | Pilot cleanup |
| 3 | **SC-4** | Pick aggregates + pick-value en sports-core | SC-3 done |
| 4 | **SC-5** | Profiles genérico en sports-core | SC-4 |
| 5 | **Mundial Compas Mobile shell** | Expo app: login, home, partido, quiniela | Migration 0, SC-5 |
| 6 | **LigaPro Demo** | Captura resultado + tabla (web o mobile prototype) | Migration 2 design |
| 7 | **La Quiniela Multi-Liga** | App + multi-competición UI | Migration 1, SC-6 |
| 8 | **LigaPro Mobile** | Producto completo amateur | Migration 2+ |

---

## 9. ¿Cuándo abrir Expo?

### Respuesta recomendada: **Después de SC-5** (no inmediatamente post-Migration 0)

### Justificación

| Momento | ¿Abrir Expo? | Por qué |
|---------|--------------|---------|
| **Después de Migration 0** | ❌ No | Migration 0 es spine BD; app mobile necesitaría adapters que aún no existen (`seasonId` en mappers, constants). Riesgo de duplicar lógica legacy antes de SC-4/SC-5. |
| **Después de SC-5** | ✅ **Sí (shell)** | Sports Core tiene matches, standings, predictions aggregates, profiles **genéricos**. El shell mobile consume contratos estables; adapters Mundial Compas quedan claros. |
| **Después de LigaPro Demo** | ⚠️ Tarde para MC Mobile | LigaPro Demo valida entidades amateur — irrelevante para Mundial Compas Mobile v1. Retrasar Expo hasta LigaPro posterga 2–3 meses sin beneficio para quiniela. |

### Secuencia óptima

```
Migration 0 → SC-4 → SC-5 → [Abrir Expo: MC Mobile shell] → LigaPro Demo (paralelo web) → La Quiniela
```

### Qué hacer entre Migration 0 y Expo

1. Constantes `DEFAULT_SEASON_ID` / slugs en adapters (SC-6 light).
2. Extraer `packages/sports-core` (prep monorepo Opción 2).
3. Definir API contract mobile: Supabase direct vs thin BFF.
4. Spike Expo: login + home + 1 partido (1 semana, throwaway o `apps/mundial-mobile`).

---

## 10. Adapters por producto (futuro)

```
packages/sports-core/          ← TS puro
packages/adapters-mundial/     ← WC 2026, scoring 3/1/0, MX channels
packages/adapters-quiniela/    ← multi-competición, pools genéricos
packages/adapters-ligapro/     ← amateur, captura en cancha
```

Cada app mobile importa **core + su adapter**; no importa lógica de otro producto.

---

## 11. Riesgos ecosistema

| Riesgo | Mitigación |
|--------|------------|
| Tres apps duplican queries Supabase | Shared package + hooks |
| Auth cross-product | Mismo Supabase project; metadata `product` en user |
| RLS multi-producto | Migration 1+ policies por competition/season |
| Web Push vs native push | Tabla tokens separada; Edge Function unificada |
| Monorepo prematuro | Opción 2 solo cuando arranque Expo |

---

## 12. Criterios de éxito ecosistema (12 meses)

- [ ] Migration 0 en prod; cero partidos pilot
- [ ] SC-4 + SC-5 completos; imports web migrados
- [ ] Mundial Compas Mobile en TestFlight / Play Internal
- [ ] La Quiniela diseño validado con 1 competición extra (Liga MX pilot)
- [ ] LigaPro Demo captura resultado en cancha
- [ ] Push nativo funcionando para al menos 1 evento (gol / recordatorio)

---

*Plan estratégico — revisar tras apply Migration 0 y SC-5.*
