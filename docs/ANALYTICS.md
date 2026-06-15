# Analytics — Mundial Compas

## Estado actual

- Wrapper central: `src/lib/analytics/track.ts`
- Eventos tipados: `src/lib/analytics/events.ts`
- Provider PostHog (cliente): `src/components/analytics/PostHogProvider.tsx` (montado en `src/app/layout.tsx`)
- Page views por ruta: `src/components/analytics/PageViewTracker.tsx` (montado en `src/app/(app)/layout.tsx`)
- **Gating doble:** PostHog solo se inicializa si `NEXT_PUBLIC_ANALYTICS_ENABLED=true` **y** existe `NEXT_PUBLIC_POSTHOG_KEY`. Si falta cualquiera, la app funciona igual y `trackEvent` queda en noop (solo `console.debug` en dev).
- **Server-side:** `trackEventServer` permanece noop (captura server-side de PostHog diferida; evita PII y dependencias de red en server actions).

## Activar

```env
# Requerido para activar PostHog
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Opcional (default: https://us.i.posthog.com). Usar https://eu.i.posthog.com para región EU.
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

> No existe `.env.example` en el repo; estas variables se documentan aquí como
> fuente de verdad de analytics. Son `NEXT_PUBLIC_*` (cliente) por diseño.

## Configuración del SDK (sin PII)

`PostHogProvider` inicializa con:

- `autocapture: false` — no captura texto/DOM que pueda contener PII.
- `capture_pageview: false` — los `page_view` se emiten manualmente con payload controlado (`{ path }`, sin query sensible).
- `person_profiles: "identified_only"` — no crea perfiles para usuarios anónimos.
- **No** se llama `identify()` en esta fase. Si se agrega, será **solo con `user.id` (UUID)**, nunca email ni nombre.

## Privacidad

No registrar:

- Contenido de mensajes de chat
- Motivos completos de solicitudes de eliminación
- Emails, nombres reales ni tokens

Sí registrar (agregado):

- Tipo de evento y propiedades enum (`liga_scope`, `reason`, `cta`, etc.)
- IDs de partido/liga (UUID) para funnels técnicos

## Eventos

| Evento | Cuándo |
|--------|--------|
| `page_view` | Cambio de ruta en App Router (`{ path }`) |
| `group_view` | Vista de dashboard de grupo (`/grupos/[slug]`) |
| `match_view` | Vista de detalle de partido (`/partidos/[id]`) |
| `pronostico_saved` | Pick **creado** (primera vez) — compat |
| `prediction_updated` | Pick **editado** (ya existía) |
| `user_signed_in` | Tras login exitoso |
| `onboarding_cta_clicked` | CTA en card de onboarding |
| `onboarding_dismissed` | "Ya entendí" |
| `pronostico_saved` | Pick guardado |
| `quiniela_selected` | Cambio de quiniela en selector |
| `filtro_jornada_selected` / `filtro_fase_selected` | Filtros en quiniela grupo |
| `grupo_created` / `grupo_joined` | Crear / unirse |
| `invite_copied` / `invite_shared` | Invitaciones |
| `deletion_requested` | Solicitud eliminación (sin motivo) |
| `chat_message_sent` | Mensaje publicado |
| `chat_message_blocked_by_moderation` | Moderación automática |
| `chat_message_reported` | Reporte |
| `leaderboard_viewed` / `leaderboard_segment_changed` | Liderato |
| `push_prompt_shown` / `push_enabled` / `push_denied` | Push |
| `pick_value_shown` | Pick Value en panel post-partido (Sprint 1.5) |
| `pitoniso_shown` | Card El Pitoniso visible con veredicto (`partido_id`, `liga_scope`, `confidence`, `favorite`, `crowd_sample_ok`) |
| `pitoniso_expanded` | Acordeón “¿Qué es El Pitoniso?” abierto (`partido_id`) |

## Integración PostHog

`trackEvent` (cliente) llama a `posthog.capture(name, properties)` cuando analytics
está activo y se ejecuta en el navegador:

```typescript
if (!isAnalyticsEnabled()) return;
if (typeof window === "undefined") return;
posthog.capture(name, properties);
```

Desactivar en cualquier momento con `NEXT_PUBLIC_ANALYTICS_ENABLED=false` o sin definir
(o quitando `NEXT_PUBLIC_POSTHOG_KEY`): la app sigue funcionando igual, en noop.

### Pendiente (futuras fases)

- Captura server-side (`trackEventServer`) vía `posthog-node` si se requiere.
- `identify(user.id)` (solo UUID) para unir sesiones anónimas a usuarios.
- Feature flags (`product=quiniela|ligapro`) — fuera de alcance de Sprint 1.
