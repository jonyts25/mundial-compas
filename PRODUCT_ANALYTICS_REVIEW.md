# Product Analytics Review — PRODUCT-ANALYTICS-REVIEW-1

**Fecha:** 2026-06-23  
**Fuentes:** Supabase (read-only, service role local), eventos documentados en `src/lib/analytics/events.ts`, guía PostHog en `docs/POSTHOG_PRODUCT_REVIEW.md`.

**Snapshot ejecutado:** `node scripts/product-analytics-snapshot.mjs --ollama`  
**Artefactos:** `product-analytics-snapshot-2026-06-23.json`, `PRODUCT_ANALYTICS_SNAPSHOT_2026_06_23.md`, `PRODUCT_ANALYTICS_OLLAMA_SUMMARY.md`

---

## Resumen ejecutivo

Mundial Compas tiene **uso real medible** pero en escala de beta cerrada (~24 usuarios registrados). La **quiniela global** concentra pocos participantes activos (13) frente a **pronósticos en ligas privadas** (754 picks vs 420 global). Los grupos privados muestran señal de producto social (4 ligas con ≥2 miembros, 1 con ≥5), pero **3 ligas abandonadas** (1 miembro, 0 picks, >3 días). Retención en cohorte de junio es **prometedora** (72.7% vuelve en 7 días), aunque el volumen es bajo para inferencias fuertes. Chat y PostHog server-side están **subutilizados** para medir engagement de superficie.

---

## Usuarios (Supabase)

| Métrica | Valor |
|---------|------:|
| Total usuarios | 24 |
| Con ≥1 pronóstico (cualquier liga) | 20 |
| Con ≥5 pronósticos | 18 |
| Con ≥10 pronósticos | 18 |
| Activos últimas 24h (pick) | 5 |
| Activos últimos 7d (pick) | 17 |

**Lectura:** Alta proporción de registrados que pronostican al menos una vez (83%). La caída 17→5 en ventana 24h sugiere picos de jornada más que uso diario constante.

---

## Quiniela global

| Métrica | Valor |
|---------|------:|
| Total pronósticos | 420 |
| Usuarios participando | 13 |
| Promedio picks/usuario | 32.3 |
| Antes del kickoff | 420 (100%) |
| Después del kickoff | 0 (0%) |

**Partidos con más picks:** Argentina vs Algeria (9), varios con 8.  
**Menos picks (con actividad):** varios partidos con 4 picks (Egypt vs Iran, etc.).

**Lectura:** Lock pre-kickoff funciona bien (0 picks tardíos detectados). Solo **54%** de usuarios con picks participan en global — el resto puede estar solo en grupos privados o sin picks globales.

---

## Quinielas privadas

| Métrica | Valor |
|---------|------:|
| Total ligas privadas | 11 |
| Activas con ≥2 miembros | 4 |
| Activas con ≥5 miembros | 1 |
| Creadores distintos | 7 |
| Abandonadas (1 miembro, 0 picks, >3d) | 3 |
| Pronósticos en privadas | 754 |
| Promedio miembros/liga activa | 3.0 |

**Lectura:** El engagement de picks está **sesgado a grupos** (754 vs 420 global). Viralidad moderada: 4 de 11 ligas tienen al menos 2 personas. 27% de ligas muestran patrón abandonado — revisar onboarding post-creación e invitaciones.

---

## Retención (aprox., cohorte primer pick global)

| Métrica | Valor |
|---------|------:|
| Usuarios con primer pronóstico global | 13 |
| Picks en >1 jornada (global) | 8 (61.5% de participantes global) |

| Cohorte (semana 1er pick) | Usuarios | D+1 | D+1 % | ≤7d | ≤7d % |
|---------------------------|--------:|----:|------:|----:|------:|
| 2026-05 | 2 | 0 | 0% | 0 | 0% |
| 2026-06 | 11 | 4 | 36.4% | 8 | 72.7% |

**Lectura:** Cohorte mayo es demasiado pequeña. Junio muestra retención semanal razonable para producto social. D+1 al 36% indica oportunidad en push / recordatorio de jornada.

---

## Engagement

### Chat (Supabase)

| Métrica | Valor |
|---------|------:|
| Mensajes de usuario | 10 |
| Partidos con chat | 4 |
| Ligas con chat | 2 |

Chat está en fase inicial; no es aún un pilar de retención medible.

### PostHog (cliente)

El script **no consulta** la API de PostHog (solo `NEXT_PUBLIC_POSTHOG_KEY` en cliente). Revisar manualmente en PostHog si analytics está habilitado en Railway:

| Evento | Uso |
|--------|-----|
| `match_view` | Vistas de partido |
| `pitoniso_shown` / `pitoniso_expanded` | Adopción Pitoniso |
| `prediction_updated` / `pronostico_saved` | Conversión pick |
| `leaderboard_viewed` | Tabla / ranking |
| `whats_new_shown` / `whats_new_dismissed` | Modal novedades |
| `oracle_lab_generated` / `ai_lab_preview_generated` | Solo lab interno |

Ver funnels en `docs/POSTHOG_PRODUCT_REVIEW.md`.

---

## Riesgos

1. **Muestra pequeña** — conclusiones de retención/viralidad no son estadísticamente robustas.
2. **Doble conteo usuario** — métricas de picks mezclan global + privado; un usuario puede estar en ambos.
3. **PostHog sin snapshot automatizado** — funnels de UI no están en el JSON diario.
4. **Ligas abandonadas** — fricción en invitar amigos o valor percibido bajo en grupo de 1.
5. **Global subparticipada** — 13/20 usuarios con picks en global; riesgo de tabla global poco representativa.

---

## Recomendación próximos 7 días

1. **Correr `npm run analytics:snapshot` diario** durante el Mundial y archivar JSON.
2. **PostHog:** revisar show rate Pitoniso y conversión `match_view` → `pronostico_saved` en partidos programados.
3. **Grupos:** medir % ligas que pasan de 1→2 miembros en 48h; experimentar recordatorio de invitación (sin cambiar features públicas si no está listo).
4. **Retención:** push o email ligero en día de jornada para los 5 usuarios “dormidos” (activos 7d pero no 24h).
5. **No construir LigaPro ni Quinielas Compas** hasta tener 2 semanas de snapshots + funnels PostHog.
6. **Mantener `npm run test:core`** en checklist pre-deploy.

---

## Cómo reproducir

```bash
# Métricas Supabase (solo lectura)
npm run analytics:snapshot

# Con interpretación Ollama (métricas agregadas, sin PII)
node scripts/product-analytics-snapshot.mjs --ollama
```

Variables requeridas en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
