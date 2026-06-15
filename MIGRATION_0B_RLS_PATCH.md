# MIGRATION-0B — RLS Patch (competitions + seasons)

> **Estado:** Migration SQL creada, **NO aplicada**.  
> **Archivo:** `supabase/migrations/20260615130000_migration_0b_competitions_seasons_rls.sql`

---

## Problema

Migration 0 crea `competitions` y `seasons` **sin RLS**. En Supabase, tablas en `public` reciben GRANTs por defecto; sin RLS, clientes autenticados podrían **SELECT/INSERT/UPDATE/DELETE** vía PostgREST si descubren el nombre de tabla.

**Riesgo identificado:** `MIGRATION_0_AUDIT.md` R2.

---

## Solución

| Tabla | RLS | Policy |
|-------|-----|--------|
| `competitions` | ENABLE | `SELECT` para `authenticated` — `USING (true)` |
| `seasons` | ENABLE | `SELECT` para `authenticated` — `USING (true)` |

**Sin policies** de INSERT/UPDATE/DELETE para `authenticated` → mutaciones bloqueadas para cliente; service role / SQL Editor siguen funcionando.

---

## Orden de apply en producción

```
1. Pilot cleanup (datos)
2. Migration 0  (20260615120000)
3. Migration 0b (20260615130000)  ← este patch
4. Smoke tests
```

**Alternativa:** aplicar 0b inmediatamente después de 0 en la misma ventana (recomendado antes de tráfico).

---

## Idempotencia

- `DROP POLICY IF EXISTS` + `CREATE POLICY`
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` es idempotente

---

## Verificación post-apply

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('competitions', 'seasons');
-- relrowsecurity = true para ambas

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('competitions', 'seasons');
-- competitions_select_authenticated | SELECT | {authenticated}
-- seasons_select_authenticated      | SELECT | {authenticated}
```

### Test cliente (opcional)

Con JWT de usuario autenticado:

- `SELECT * FROM competitions` → **200 OK**
- `INSERT INTO competitions (...)` → **403 / policy violation**

---

## Rollback

```sql
DROP POLICY IF EXISTS competitions_select_authenticated ON public.competitions;
DROP POLICY IF EXISTS seasons_select_authenticated ON public.seasons;

ALTER TABLE public.competitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons DISABLE ROW LEVEL SECURITY;
```

Solo revertir RLS; tablas y datos permanecen.

---

## Qué NO hace

- No añade RLS a `partidos.season_id` (ya cubierto por policy existente en `partidos`)
- No expone write a authenticated
- No cambia app (aún no lee estas tablas)

---

*Patch de seguridad — no aplicado.*
