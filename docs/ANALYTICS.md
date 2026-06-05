# Analytics — Mundial Compas

## Estado actual (MVP)

- Wrapper central: `src/lib/analytics/track.ts`
- Eventos tipados: `src/lib/analytics/events.ts`
- **Sin provider externo** por defecto: eventos solo se loguean en desarrollo (`console.debug`).
- Producción: noop hasta activar `NEXT_PUBLIC_ANALYTICS_ENABLED=true` y conectar PostHog (u otro).

## Activar

```env
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

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

## Integración PostHog (futuro)

En `trackEvent` / `trackEventServer`, cuando `NEXT_PUBLIC_ANALYTICS_ENABLED`:

```typescript
// posthog.capture(name, properties);
```

Desactivar en cualquier momento con la env var en `false` o sin definir.
