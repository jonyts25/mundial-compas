# MIGRATION-0.5 — Season Ingestion Plan

> **Estado:** Diseño únicamente. **NO modificar código** en esta fase.  
> **Problema:** Tras Migration 0, upserts/inserts de partidos **no setean** `season_id` → nuevas filas quedan NULL.

**Referencia:** `MIGRATION_0_DEPENDENCY_AUDIT.md` (R3, impacto medio)

---

## 1. Objetivo

Garantizar que **todo partido no-pilot** tenga `season_id` asignado en insert/upsert, sin depender solo del backfill one-shot de Migration 0.

---

## 2. Constante canonical

| Constante | Valor |
|-----------|-------|
| `DEFAULT_SEASON_ID` | `b0000000-0000-4000-8000-000000000002` |
| `DEFAULT_COMPETITION_ID` | `b0000000-0000-4000-8000-000000000001` |
| Slug season | `fifa-world-cup-2026` |

**Ubicación propuesta (fase implementación):** `src/lib/constants.ts` o `src/lib/sports-core/adapters/mundial-compas/constants.ts`

---

## 3. Archivos a modificar (fase implementación — NO ahora)

### 3.1 Scripts Node (`.mjs`)

| Script | Cambio |
|--------|--------|
| `scripts/recargar-mundial.mjs` | Añadir `season_id: DEFAULT_SEASON_ID` en cada row del upsert |
| `scripts/sync-calendar-cron.mjs` | Idem |
| `scripts/cargar-pilot-*.mjs` | **No tocar** — pilot debe quedar NULL o no ejecutarse en prod |
| `scripts/sync-lineups-cron.mjs` | Sin cambio (UPDATE metadata, no insert) |

### 3.2 API admin

| Archivo | Cambio |
|---------|--------|
| `src/app/api/admin/cargar-partidos/route.ts` | Inyectar `season_id` en rows no-pilot antes de upsert |
| `src/lib/api-football/map-fixture-row.ts` | Campo opcional `seasonId` en output cuando no es pilot |
| `src/lib/apifootball/map-event-to-partido.ts` | Idem |

### 3.3 Sync live (UPDATE only)

| Archivo | Cambio |
|---------|--------|
| `src/lib/partidos/sync-live-scores-api-sports.ts` | Sin cambio obligatorio (UPDATE estatus/marcador) |
| `src/lib/apifootball/webhook/process.ts` | Sin cambio obligatorio |

### 3.4 Types

| Archivo | Cambio |
|---------|--------|
| `src/types/database.ts` | Añadir `season_id?: string \| null` a `Partido` |

---

## 4. Reglas de negocio

| Caso | `season_id` |
|------|-------------|
| Partido Mundial (ingest normal) | `b0000000-…000002` |
| Partido pilot (`metadata.pilot`) | `NULL` (idealmente no existen post-cleanup) |
| Upsert existente sin season en payload | Preservar valor BD; si NULL → set WC 2026 |
| Futuro multi-competición | Resolver desde `competitions.provider_config` por league_id |

---

## 5. Estrategia upsert

```typescript
// Pseudocódigo — NO implementar aún
function withSeasonId(row: PartidoUpsert, isPilot: boolean): PartidoUpsert {
  if (isPilot) return row;
  return {
    ...row,
    season_id: row.season_id ?? DEFAULT_SEASON_ID,
  };
}
```

Para upsert Supabase con `onConflict: api_football_fixture_id`:

- Incluir `season_id` en payload **no sobrescribe** otros campos si merge selectivo
- Verificar que upsert no ponga `season_id: null` explícito

---

## 6. Opción BD alternativa (Migration 0.5b — evaluar)

Trigger `BEFORE INSERT` en `partidos`:

```sql
-- SOLO DISEÑO — NO APLICAR
-- IF NEW.season_id IS NULL AND NOT is_pilot(NEW.metadata) THEN
--   NEW.season_id := 'b0000000-0000-4000-8000-000000000002';
-- END IF;
```

| Pros | Contras |
|------|---------|
| Centralizado; scripts olvidados cubiertos | Lógica pilot en BD; zona congelada parcialmente |
| | Más difícil rollback |

**Recomendación:** empezar con **app/scripts** (§3); trigger solo si monitoreo muestra NULLs recurrentes.

---

## 7. Monitoreo post-M0 (hasta 0.5 implementado)

Query diaria en prod:

```sql
SELECT COUNT(*) AS partidos_sin_season
FROM public.partidos
WHERE season_id IS NULL
  AND NOT (
    COALESCE(metadata->>'competencia', '') = 'pilot'
    OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
  );
-- Alerta si > 0
```

---

## 8. Orden en roadmap

```
Migration 0 apply + backfill
  → Migration 0b RLS
  → Monitoreo NULL season_id (1–2 semanas o hasta primer cron post-M0)
  → Migration 0.5 código ingest (este plan)
  → (Opcional) Migration 0c NOT NULL + índice
```

---

## 9. Criterios de done (fase implementación)

- [ ] `recargar-mundial.mjs` setea season_id
- [ ] `cargar-partidos` route setea season_id (no-pilot)
- [ ] `sync-calendar-cron.mjs` setea season_id
- [ ] Constante documentada en código
- [ ] `database.ts` actualizado
- [ ] Query monitoreo = 0 tras cron cycle
- [ ] Sin regresión pilot filter en app

---

*Plan de ingestión — sin cambios de código en PRODUCTION-READINESS-1.*
