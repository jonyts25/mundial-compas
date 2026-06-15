# MIGRATION-0 — Smoke Tests (Staging)

> **Cuándo ejecutar:** Después de **pilot cleanup** + **apply Migration 0** en Supabase staging.  
> **Entorno:** Staging app apuntando a Supabase staging (no producción).

**Referencias:** `MIGRATION_0_DEPENDENCY_AUDIT.md`, `MIGRATION_0_READY_REPORT.md`

---

## Criterios globales

| Resultado | Definición |
|-----------|------------|
| **PASS** | Comportamiento igual o mejor que pre-migration; SQL cumple criterio |
| **FAIL** | Error 500, datos incorrectos, SQL no cumple, regresión UX crítica |
| **SKIP** | No aplicable en staging (ej. sin partido en vivo) — documentar razón |

**Regla:** Cualquier **FAIL** en sección **G (BD)** o **P0** en A–D → **NO GO** para producción.

---

## A. Home

| ID | Prueba | Pasos | PASS | FAIL |
|----|--------|-------|------|------|
| A1 | Carga dashboard personal | Login → `/` → ver saludo, ranking, pendientes | Cards visibles sin error | Error boundary / spinner infinito |
| A2 | Carrusel quinielas | Deslizar cards global + grupos | ≥1 card con progreso y CTA | Carrusel vacío o crash |
| A3 | Calendario partidos | Scroll calendario, seleccionar día | Partidos del día listados | Lista vacía sin razón |
| A4 | Exclusión pilot | Confirmar no hay partidos UCL/Concacaf en calendario | Solo Mundial real | Partidos pilot visibles |
| A5 | Pilot banner | Con `PILOT_MODE_ENABLED=false` | Sin banner o banner sin partidos | Banner roto |

---

## B. Quiniela

| ID | Prueba | Pasos | PASS | FAIL |
|----|--------|-------|------|------|
| B1 | Cargar quiniela global | `/quiniela` | Lista partidos programados | Error load |
| B2 | Guardar pronóstico nuevo | Partido abierto → guardar marcador | Toast/confirmación; persiste al reload | Error save / no persiste |
| B3 | Editar pronóstico | Cambiar marcador partido ya guardado | Actualiza; analytics `prediction_updated` | Lock incorrecto o error |
| B4 | Quiniela grupo | `/grupos/[slug]/quiniela` → guardar | Guarda en liga grupo | Guarda en global por error |
| B5 | Lock kickoff | Partido iniciado (si hay uno) | Inputs readonly | Permite editar post-kickoff |

---

## C. Partido

| ID | Prueba | Pasos | PASS | FAIL |
|----|--------|-------|------|------|
| C1 | Carga detalle | `/partidos/[id]` partido programado | Header + info carga | 404 / 500 |
| C2 | Pitoniso | Partido programado con agregados | Mensaje Pitoniso o loading → contenido | Stack infinito / crash |
| C3 | Multi-quiniela chips | Usuario con 2+ ligas → cambiar chip | Un Pitoniso; form cambia liga | Duplicados / data cruzada |
| C4 | Guardar en partido | Guardar pronóstico desde partido | Persiste por liga seleccionada | Error o liga incorrecta |
| C5 | Chat | Enviar mensaje en chat partido | Mensaje aparece | Error send / realtime roto |
| C6 | Safe area header | Móvil / DevTools iPhone | Flecha atrás bajo notch | Flecha bajo notch |

---

## D. Grupos

| ID | Prueba | Pasos | PASS | FAIL |
|----|--------|-------|------|------|
| D1 | Dashboard grupo | `/grupos/[slug]` | Info grupo carga | Error |
| D2 | Leaderboard grupo | `/grupos/[slug]/leaderboard` | Tabla con posiciones | Vacío / error RPC |
| D3 | Ranking home card | Carrusel muestra `#rank` coherente | Número presente o "Sin datos" | Crash |
| D4 | Leaderboard global | `/leaderboard` | Tabla liderato carga | Error RPC |
| D5 | Segmentos leaderboard | Filtrar jornada/fase (si UI) | Filtra sin error | Error o datos mezclados |

---

## E. Cron / infra Railway (staging o prod-like)

| ID | Prueba | Pasos | PASS | FAIL |
|----|--------|-------|------|------|
| E1 | sync-live-cron | Trigger manual `POST /api/admin/sync-live` o cron 1 ciclo | 200; logs sin error SQL | 500; error column season |
| E2 | livescore-relay | Servicio Online; 1 ciclo relay | Online; sin crash | Offline / error BD |
| E3 | sync-calendar-cron | Si corre en staging — 1 ciclo | Partidos actualizados | Error upsert |
| E4 | Webhook api-football | Evento test (si disponible) | Procesa sin error | Falla por schema |

**Nota:** E3 puede dejar `season_id NULL` en partidos **nuevos** — documentar conteo post-cron (ver G5).

---

## F. Analytics (PostHog)

| ID | Prueba | Pasos | PASS | FAIL |
|----|--------|-------|------|------|
| F1 | `page_view` | Navegar 2–3 pantallas | Eventos en PostHog live | Sin eventos |
| F2 | `match_view` | Abrir partido | Evento con `partido_id` | Ausente |
| F3 | `pronostico_saved` | Guardar pronóstico nuevo | Evento con liga_scope | Ausente |
| F4 | `prediction_updated` | Editar pronóstico | Evento edit | Ausente |
| F5 | `home_quiniela_summary_shown` | Home con carrusel | Evento once | — (SKIP si single liga) |

Verificar en PostHog → Live events (staging project).

---

## G. Base de datos (SQL Editor staging)

Ejecutar **después** de apply Migration 0.

| ID | Query | PASS | FAIL |
|----|-------|------|------|
| G1 | `SELECT COUNT(*) FROM public.competitions;` | **≥ 1** | 0 o error |
| G2 | `SELECT COUNT(*) FROM public.seasons;` | **≥ 1** | 0 o error |
| G3 | `SELECT column_name FROM information_schema.columns WHERE table_name='partidos' AND column_name='season_id';` | **1 fila** | 0 filas |
| G4 | `SELECT COUNT(*) FROM public.partidos WHERE season_id IS NULL;` | **= 0** | > 0 |
| G5 | `SELECT COUNT(*) FROM public.partidos WHERE season_id = 'b0000000-0000-4000-8000-000000000002';` | **= partidos_total** | Desajuste |
| G6 | Pilot restantes (post-cleanup) | **= 0** | > 0 |
| G7 | FK existe: `SELECT 1 FROM pg_constraint WHERE conname='partidos_season_id_fkey';` | **1 fila** | 0 |
| G8 | Triggers partidos intactos | `partidos_after_update_puntos`, `partidos_updated_at` presentes | Faltan |
| G9 | Seed UUID correcto | `SELECT id, slug FROM competitions WHERE id='b0000000-0000-4000-8000-000000000001';` | 1 fila `fifa-world-cup` | 0 |

### Queries G4–G6

```sql
SELECT COUNT(*) AS partidos_sin_season FROM public.partidos WHERE season_id IS NULL;

SELECT COUNT(*) AS partidos_wc2026
FROM public.partidos
WHERE season_id = 'b0000000-0000-4000-8000-000000000002';

SELECT COUNT(*) AS pilot_restantes
FROM public.partidos
WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
   OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE;
```

---

## Plantilla de resultados

| Sección | PASS | FAIL | SKIP |
|---------|------|------|------|
| A Home | /5 | | |
| B Quiniela | /5 | | |
| C Partido | /6 | | |
| D Grupos | /5 | | |
| E Cron | /4 | | |
| F Analytics | /5 | | |
| G BD | /9 | | |

**Ejecutor:** _______________  
**Fecha:** _______________  
**Entorno Supabase:** _______________  
**Commit app desplegado:** _______________

---

## Regresiones conocidas a vigilar (no FAIL automático)

| Observación | Acción |
|-------------|--------|
| Partidos nuevos post-cron con `season_id NULL` | Monitoreo G4 diario hasta Migration 0.5 ingest |
| `competitions` legible vía API autenticada | Documentar; fix RLS antes prod |
| Pitoniso loading lento | Pre-existente; no bloqueante M0 |

---

*Smoke test plan — no ejecutado en esta sesión.*
