# MIGRATION-0 — SQL Review (propuesta, no aplicar)

> **Estado:** Documento de revisión únicamente.  
> **Basado en:** `MIGRATION_0_DESIGN.md`  
> **NO** crear archivo en `supabase/migrations/`. **NO** ejecutar en Supabase. **NO** tocar producción.

---

## UUIDs fijos documentados (seeds)

| Entidad | UUID |
|---------|------|
| `competitions` — FIFA World Cup | `b0000000-0000-4000-8000-000000000001` |
| `seasons` — World Cup 2026 | `b0000000-0000-4000-8000-000000000002` |

Convención alineada con `LIGA_GLOBAL_ID` (`a0000000-…`): prefijo `b0000000` = capa Sports Core / competencia.

---

## 1. SQL propuesto — tabla `competitions`

```sql
-- Migration 0 — REVISIÓN (no aplicar aún)

CREATE TABLE public.competitions (
  id                  UUID PRIMARY KEY,
  slug                CITEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  short_name          TEXT,
  sport               TEXT NOT NULL DEFAULT 'football',
  format              TEXT NOT NULL DEFAULT 'groups_knockout',
  country_scope       TEXT,
  timezone_default    TEXT NOT NULL DEFAULT 'America/Mexico_City',
  provider_config     JSONB NOT NULL DEFAULT '{}'::jsonb,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT competitions_format_check CHECK (
    format IN ('league', 'groups_knockout', 'knockout_only', 'custom')
  )
);

COMMENT ON TABLE public.competitions IS
  'Competición deportiva (Mundial, Liga MX, etc.). Migration 0 — spine Sports Core.';

COMMENT ON COLUMN public.competitions.provider_config IS
  'IDs de proveedores externos: apifootball, api_sports, ventanas sync, etc.';

CREATE TRIGGER competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

**Notas de revisión:**

- `id` sin `DEFAULT gen_random_uuid()` en seeds fijos; inserts explícitos.
- `slug` en `CITEXT` como `ligas_privadas.slug`.
- Sin RLS en Migration 0 (ver §9).

---

## 2. SQL propuesto — tabla `seasons`

```sql
CREATE TABLE public.seasons (
  id                  UUID PRIMARY KEY,
  competition_id      UUID NOT NULL REFERENCES public.competitions (id) ON DELETE RESTRICT,
  slug                CITEXT NOT NULL UNIQUE,
  year_label          TEXT NOT NULL,
  start_at            TIMESTAMPTZ,
  end_at              TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'scheduled',
  is_current          BOOLEAN NOT NULL DEFAULT FALSE,
  external_ids        JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seasons_status_check CHECK (
    status IN ('scheduled', 'active', 'finished', 'cancelled')
  ),
  CONSTRAINT seasons_dates_order CHECK (
    start_at IS NULL OR end_at IS NULL OR start_at <= end_at
  )
);

COMMENT ON TABLE public.seasons IS
  'Temporada de una competición. partidos.season_id apunta aquí en Migration 0.';

CREATE INDEX idx_seasons_competition ON public.seasons (competition_id);

CREATE UNIQUE INDEX idx_seasons_one_current_per_competition
  ON public.seasons (competition_id)
  WHERE is_current = TRUE;

CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

**Notas de revisión:**

- Índice parcial `is_current`: solo una season “current” por competencia.
- `ON DELETE RESTRICT` en FK hacia `competitions` para evitar borrado accidental con partidos referenciando seasons.

---

## 3. SQL propuesto — seed World Cup 2026

```sql
-- Constantes (documentación)
-- v_competition_id := 'b0000000-0000-4000-8000-000000000001'
-- v_season_id      := 'b0000000-0000-4000-8000-000000000002'

INSERT INTO public.competitions (
  id,
  slug,
  name,
  short_name,
  sport,
  format,
  country_scope,
  timezone_default,
  provider_config,
  active,
  metadata
) VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'fifa-world-cup',
  'Copa Mundial de la FIFA',
  'Mundial 2026',
  'football',
  'groups_knockout',
  'international',
  'America/Mexico_City',
  jsonb_build_object(
    'apifootball', jsonb_build_object(
      'league_id', 28,
      'base', 'apifootball.com'
    ),
    'api_sports', jsonb_build_object(
      'league_id', 1,
      'season', 2026
    ),
    'sync', jsonb_build_object(
      'date_from', '2026-06-01',
      'date_to', '2026-07-31',
      'timezone', 'America/Mexico_City'
    )
  ),
  TRUE,
  jsonb_build_object(
    'hosts', jsonb_build_array('USA', 'MEX', 'CAN'),
    'edition', 23
  )
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seasons (
  id,
  competition_id,
  slug,
  year_label,
  start_at,
  end_at,
  status,
  is_current,
  external_ids,
  metadata
) VALUES (
  'b0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  'fifa-world-cup-2026',
  '2026',
  '2026-06-01T00:00:00+00:00',
  '2026-07-31T23:59:59+00:00',
  'scheduled',
  TRUE,
  jsonb_build_object('api_sports_season', 2026),
  jsonb_build_object('default_for_mundial_compas', TRUE)
)
ON CONFLICT (id) DO NOTHING;
```

**Idempotencia:** `ON CONFLICT (id) DO NOTHING` permite re-ejecutar seed en entornos locales sin duplicar.

---

## 4. SQL propuesto — `partidos.season_id` nullable

```sql
ALTER TABLE public.partidos
  ADD COLUMN IF NOT EXISTS season_id UUID;
```

**Decisión explícita:** columna **nullable** en Migration 0. Sin `NOT NULL`.

---

## 5. SQL propuesto — FK hacia `seasons(id)`

```sql
ALTER TABLE public.partidos
  ADD CONSTRAINT partidos_season_id_fkey
  FOREIGN KEY (season_id)
  REFERENCES public.seasons (id)
  ON DELETE RESTRICT;
```

**Orden recomendado:** ejecutar §4 y §5 en la misma transacción, **después** de crear `seasons` y el seed WC 2026.

**Alternativa si la columna ya existía sin FK:** usar `ADD CONSTRAINT` solo si no existe (revisar en migración real con guard).

---

## 6. SQL propuesto — backfill partidos no-pilot

Criterio pilot alineado con `isPilotPartidoMetadata()` en `src/lib/apifootball/pilot-config.ts`:

- `metadata->>'competencia' = 'pilot'`
- `(metadata->'pilot')::boolean IS TRUE`

```sql
-- Backfill idempotente: solo filas no-pilot sin season asignada
UPDATE public.partidos p
SET
  season_id = 'b0000000-0000-4000-8000-000000000002',
  updated_at = now()
WHERE p.season_id IS NULL
  AND NOT (
    COALESCE(p.metadata->>'competencia', '') = 'pilot'
    OR COALESCE((p.metadata->'pilot')::boolean, FALSE) = TRUE
  );
```

**Política pilot (Opción A del diseño):** partidos pilot quedan con `season_id IS NULL`; la app sigue filtrándolos por `metadata`.

**Partidos nuevos post-backfill:** hasta actualizar scripts de ingest, pueden quedar con `season_id` NULL si no son pilot — riesgo documentado en §10.

---

## 7. SQL de verificación

Ejecutar **después** del backfill, antes de cualquier endurecimiento (NOT NULL / índice).

```sql
-- 7.1 Total partidos
SELECT COUNT(*) AS partidos_total
FROM public.partidos;

-- 7.2 Partidos pilot (metadata)
SELECT COUNT(*) AS partidos_pilot
FROM public.partidos p
WHERE COALESCE(p.metadata->>'competencia', '') = 'pilot'
   OR COALESCE((p.metadata->'pilot')::boolean, FALSE) = TRUE;

-- 7.3 No-pilot sin season_id (debe ser 0 antes de NOT NULL)
SELECT COUNT(*) AS partidos_no_pilot_sin_season
FROM public.partidos p
WHERE p.season_id IS NULL
  AND NOT (
    COALESCE(p.metadata->>'competencia', '') = 'pilot'
    OR COALESCE((p.metadata->'pilot')::boolean, FALSE) = TRUE
  );

-- 7.4 Partidos con season WC 2026
SELECT COUNT(*) AS partidos_wc_2026
FROM public.partidos
WHERE season_id = 'b0000000-0000-4000-8000-000000000002';

-- 7.5 Resumen cruzado (sanity check)
SELECT
  CASE
    WHEN COALESCE(metadata->>'competencia', '') = 'pilot'
      OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
    THEN 'pilot'
    WHEN season_id = 'b0000000-0000-4000-8000-000000000002'
    THEN 'wc_2026'
    WHEN season_id IS NULL
    THEN 'null_other'
    ELSE 'other_season'
  END AS bucket,
  COUNT(*) AS cnt
FROM public.partidos
GROUP BY 1
ORDER BY 1;

-- 7.6 Invariante esperada post-backfill:
-- partidos_total = partidos_pilot + partidos_wc_2026 + partidos_null_other
-- partidos_no_pilot_sin_season = 0
```

---

## 8. SQL de rollback

Ejecutar en **orden inverso** al apply. Solo válido mientras `season_id` siga **nullable** y la app no dependa de la columna.

```sql
-- 8.1 Revertir backfill (todas las filas WC 2026 → NULL)
UPDATE public.partidos
SET
  season_id = NULL,
  updated_at = now()
WHERE season_id = 'b0000000-0000-4000-8000-000000000002';

-- 8.2 Eliminar FK y columna
ALTER TABLE public.partidos
  DROP CONSTRAINT IF EXISTS partidos_season_id_fkey;

ALTER TABLE public.partidos
  DROP COLUMN IF EXISTS season_id;

-- 8.3 Eliminar seasons (solo si no hay FKs restantes)
DROP TABLE IF EXISTS public.seasons;

-- 8.4 Eliminar competitions
DROP TABLE IF EXISTS public.competitions;
```

**Advertencia rollback:** si en el futuro existieran otras seasons o partidos apuntando a otros `season_id`, ajustar §8.1 antes de DROP.

---

## 9. Decisiones explícitas (Migration 0)

| Tema | Decisión Migration 0 |
|------|----------------------|
| **NOT NULL** en `partidos.season_id` | **NO** — queda para Migration 0c post-validación |
| **Índice** `(season_id, fecha_kickoff)` | **NO en Migration 0** — opcional en fase post-backfill (Migration 0c) cuando existan queries que filtren por season |
| **RLS** | **NO cambios** — `competitions`/`seasons` sin policies nuevas en M0; lectura vía service role / futuro |
| **Triggers** existentes | **NO cambios** — `partidos_after_update_puntos`, `trg_bloquear_pronostico_kickoff`, `set_updated_at`, etc. |
| **RPC / funciones** | **NO cambios** — `tabla_liderato_quiniela`, `calcular_puntos_pronostico`, `recalcular_puntos_partido`, `handle_new_user` |
| **`pronosticos`** | **NO cambios** de schema |
| **`ligas_privadas`** | **NO cambios** en M0 |
| **`rounds`** | **NO** — Migration 1 |
| **`competition_id` en `partidos`** | **NO** — solo `season_id`; competencia vía JOIN |
| **Pilot** | `season_id` NULL; exclusión app por `metadata` sin cambio |

### Índice opcional (Migration 0c — referencia, no aplicar en M0)

```sql
-- SOLO después de backfill verificado y antes/después de NOT NULL (fase posterior)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partidos_season_fecha
--   ON public.partidos (season_id, fecha_kickoff)
--   WHERE season_id IS NOT NULL;
```

---

## 10. Riesgos antes de aplicar

| # | Riesgo | Severidad | Qué revisar antes de apply |
|---|--------|-----------|----------------------------|
| 1 | Ejecutar en **producción** sin ventana acordada | Alta | Aplicar primero en local/staging; backup Supabase |
| 2 | Backfill incompleto + NOT NULL prematuro (fase futura) | Crítica | §7.3 debe ser **0** antes de cualquier NOT NULL |
| 3 | Partidos nuevos sin `season_id` tras M0 | Media | Scripts ingest aún no setean columna; monitorear NULLs no-pilot |
| 4 | Drift UUID seed vs constantes app | Media | Documentar en `constants.ts` en fase adapter (fuera de M0 SQL) |
| 5 | `DROP CONSTRAINT` / rollback en prod con tráfico | Media | Rollback solo en ventana; verificar que app no lee `season_id` |
| 6 | Locks en `ALTER TABLE partidos` en tabla grande | Baja–Media | `ADD COLUMN` nullable es rápido en PG 11+; aun así evitar horario pico |
| 7 | FK `RESTRICT` impide borrar season accidentalmente | Baja (deseable) | Comportamiento intencional |
| 8 | Pilot mal clasificado en metadata | Media | Revisar §7.2 conteo pilot vs expectativa manual |
| 9 | Índice único `is_current` bloquea segunda season current | Baja | Solo un seed con `is_current = TRUE` en M0 |
| 10 | Sin RLS en tablas nuevas | Baja en M0 | Tablas no expuestas a cliente aún; habilitar RLS en Migration 1 si se exponen |

---

## Orden de ejecución propuesto (cuando se apruebe)

1. §1 — `CREATE competitions`
2. §2 — `CREATE seasons`
3. §3 — seed WC 2026
4. §4 + §5 — `ALTER partidos` + FK
5. §6 — backfill
6. §7 — verificación (criterio: §7.3 = 0)
7. **Stop** — no NOT NULL, no índice, no cambios app

---

## Relación con Engagement Sprint

Independiente. El dashboard de home (`7681c3b`) no lee `season_id`; Migration 0 no requiere deploy de app.

---

*Documento generado para revisión humana. No sustituye una migración versionada en `supabase/migrations/`.*
