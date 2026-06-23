# Product Analytics Snapshot — 2026-06-23

Generado por `scripts/product-analytics-snapshot.mjs` (solo lectura).

## Usuarios

| Métrica | Valor |
|---------|------:|
| Total usuarios | 24 |
| Con ≥1 pronóstico | 20 |
| Con ≥5 pronósticos | 18 |
| Con ≥10 pronósticos | 18 |
| Pronóstico últimas 24h | 5 usuarios |
| Pronóstico últimos 7d | 17 usuarios |

## Quiniela global

| Métrica | Valor |
|---------|------:|
| Total pronósticos | 420 |
| Usuarios participando | 13 |
| Promedio picks/usuario | 32.3 |
| Antes del kickoff | 420 (100%) |
| Después del kickoff | 0 (0%) |

### Partidos con más picks (global)
- Argentina vs Algeria: **9** picks
- Austria vs Jordan: **8** picks
- Portugal vs Congo DR: **8** picks
- Netherlands vs Sweden: **8** picks
- Spain vs Saudi Arabia: **8** picks

### Partidos con menos picks (global, >0)
- Egypt vs Iran: **4** picks
- Senegal vs Iraq: **4** picks
- Congo DR vs Uzbekistan: **4** picks
- Croatia vs Ghana: **4** picks
- New Zealand vs Belgium: **4** picks

## Quinielas privadas

| Métrica | Valor |
|---------|------:|
| Total ligas privadas | 11 |
| Activas con ≥2 miembros | 4 |
| Activas con ≥5 miembros | 1 |
| Creadas por usuarios (no sistema) | 7 creadores / 11 ligas |
| Abandonadas (1 miembro, 0 picks, >3d) | 3 |
| Total pronósticos en privadas | 754 |
| Promedio miembros/liga activa | 3 |

## Retención (aprox.)

| Métrica | Valor |
|---------|------:|
| Usuarios con primer pronóstico | 13 |
| Picks en >1 jornada (global) | 8 usuarios |

### Cohortes por semana de primer pronóstico

| Semana | Usuarios | D+1 | D+1 % | ≤7d | ≤7d % |
|--------|--------:|----:|------:|----:|------:|
| 2026-05 | 2 | 0 | 0% | 0 | 0% |
| 2026-06 | 11 | 4 | 36.4% | 8 | 72.7% |

## Engagement (chat Supabase)

| Métrica | Valor |
|---------|------:|
| Mensajes usuario (total) | 10 |
| Partidos con chat | 4 |
| Ligas con chat | 2 |

## PostHog

Estado: no consultado desde script

PostHog client-side only; sin API key de proyecto en env para consultas server-side.

Eventos a revisar manualmente:
- `match_view`
- `pitoniso_shown`
- `pitoniso_expanded`
- `prediction_updated`
- `leaderboard_viewed`
- `whats_new_shown`
- `whats_new_dismissed`
- `oracle_lab_generated`
- `ai_lab_preview_generated`