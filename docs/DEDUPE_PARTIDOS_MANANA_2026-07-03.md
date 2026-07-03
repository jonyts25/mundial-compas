# Consolidación de partidos duplicados — 3 jul 2026 (CDMX)

Guía para revisar y fusionar los **2 partidos duplicados de mañana** (placeholder KO + fixture real api-sports) y consolidar pronósticos en la fila canonical.

**Proyecto Supabase producción:** `hbcsvpbksuunbhagjqyk`  
**Fecha de auditoría:** 3 jul 2026

---

## Resumen

| Partido | Placeholder (legacy) | Fixture real (canonical) |
|---------|----------------------|--------------------------|
| **Argentina vs Cape Verde** (M86) | `cbe00785-7f28-4df4-b00f-c84d905ffea2` · fixture `9000086` | `e2cbf043-df00-4a94-b67b-20773d394027` · fixture `1565179` |
| **Australia vs Egypt** (M88) | `c060c557-b453-4ebf-9eb3-ddba09d36e2d` · fixture `9000088` | `53226829-63f5-4568-9bdc-d6d590cf2f3b` · fixture `1565178` |

Casi todos los pronósticos están en la fila **placeholder**. Algunos usuarios tienen marcador en **ambas** filas del mismo partido.

---

## Conflictos detectados (mismo usuario + misma liga, marcadores distintos)

Al consolidar con `reconcile_knockout_partido_duplicates()`, **gana el pronóstico del placeholder** y se borra el de la fila real.

### Argentina vs Cape Verde

| Usuario | Liga | Placeholder | Real | Resultado tras consolidar |
|---------|------|-------------|------|---------------------------|
| `aaa99915-0487-4605-9dac-5da0f906f7e5` | `33b52a17-17e9-4b24-b40b-0d2236bcfcec` (privada) | **3-0** | 3-1 | **3-0** |
| `aaa99915-0487-4605-9dac-5da0f906f7e5` | `a0000000-0000-4000-8000-000000000001` (global) | **2-0** | 3-0 | **2-0** |
| `4dde58c0-c9e5-48c0-970c-7656670aef5d` | global | **4-0** | 3-0 | **4-0** |

### Australia vs Egypt

| Usuario | Liga | Placeholder | Real | Resultado tras consolidar |
|---------|------|-------------|------|---------------------------|
| `aaa99915-0487-4605-9dac-5da0f906f7e5` | `33b52a17-17e9-4b24-b40b-0d2236bcfcec` (privada) | **0-1** | 0-2 | **0-1** |
| `aaa99915-0487-4605-9dac-5da0f906f7e5` | global | **0-1** | 1-2 | **0-1** |

El resto de usuarios solo tienen pronóstico en el placeholder → se mueven al fixture real **sin pérdida**.

> Si quieres conservar el marcador de la fila **real** en algún caso, actualiza el placeholder **antes** de ejecutar el `reconcile` (ver sección opcional al final).

---

## Paso 1 — Auditar duplicados de mañana

Ejecutar en **Supabase → SQL Editor** (producción):

```sql
WITH manana AS (
  SELECT ((now() AT TIME ZONE 'America/Mexico_City')::date + 1) AS d
),
dupes AS (
  SELECT
    public.norm_partido_team_name(equipo_local_nombre) AS home,
    public.norm_partido_team_name(equipo_visitante_nombre) AS away,
    array_agg(p.id ORDER BY p.api_football_fixture_id DESC) AS ids,
    array_agg(p.api_football_fixture_id ORDER BY p.api_football_fixture_id DESC) AS fixture_ids,
    array_agg(p.equipo_local_nombre || ' vs ' || p.equipo_visitante_nombre) AS labels
  FROM public.partidos p, manana m
  WHERE (p.fecha_kickoff AT TIME ZONE 'America/Mexico_City')::date = m.d
    AND p.estatus != 'cancelado'
  GROUP BY 1, 2
  HAVING count(*) > 1
)
SELECT
  d.*,
  pr.liga_id,
  pr.usuario_id,
  pr.goles_local,
  pr.goles_visitante,
  pr.partido_id
FROM dupes d
JOIN public.pronosticos pr ON pr.partido_id = ANY(d.ids)
ORDER BY d.home, d.away, pr.liga_id, pr.usuario_id;
```

**Resultado esperado:** 2 pares duplicados (Argentina/Cape Verde y Australia/Egypt).

---

## Paso 2 — Verificar que los kickoffs coinciden

`reconcile_knockout_partido_duplicates()` solo fusiona si **ambas filas tienen el mismo `fecha_kickoff`**.

```sql
SELECT
  id,
  api_football_fixture_id,
  equipo_local_nombre || ' vs ' || equipo_visitante_nombre AS partido,
  fecha_kickoff,
  estatus
FROM public.partidos
WHERE id IN (
  'cbe00785-7f28-4df4-b00f-c84d905ffea2',
  'e2cbf043-df00-4a94-b67b-20773d394027',
  'c060c557-b453-4ebf-9eb3-ddba09d36e2d',
  '53226829-63f5-4568-9bdc-d6d590cf2f3b'
)
ORDER BY equipo_local_nombre, api_football_fixture_id;
```

Si en algún par el `fecha_kickoff` **no coincide**, alinea el placeholder al real **antes** de consolidar:

```sql
-- Solo si kickoffs difieren — Argentina
UPDATE public.partidos
SET fecha_kickoff = (
  SELECT fecha_kickoff FROM public.partidos WHERE id = 'e2cbf043-df00-4a94-b67b-20773d394027'
)
WHERE id = 'cbe00785-7f28-4df4-b00f-c84d905ffea2';

-- Solo si kickoffs difieren — Australia
UPDATE public.partidos
SET fecha_kickoff = (
  SELECT fecha_kickoff FROM public.partidos WHERE id = '53226829-63f5-4568-9bdc-d6d590cf2f3b'
)
WHERE id = 'c060c557-b453-4ebf-9eb3-ddba09d36e2d';
```

---

## Paso 3 — Consolidar (fusionar pronósticos y borrar legacy)

```sql
SELECT * FROM public.reconcile_knockout_partido_duplicates();
```

**Resultado esperado:** 2 filas con `canonical_id` (fixture real) y `legacy_id` (placeholder). Las filas placeholder se eliminan; los pronósticos quedan en el fixture real.

**Qué hace la función:**
1. Toma como **canonical** el fixture real (`api_football_fixture_id` < 9_000_000).
2. Si un usuario tiene pronóstico en **ambas** filas (misma liga), **conserva el del placeholder** y borra el del real.
3. Mueve todos los pronósticos del placeholder al canonical.
4. Remapea chat, notificaciones y silencios push.
5. Elimina la fila placeholder.

---

## Paso 4 — Verificar después de consolidar

### 4a. No debe haber duplicados mañana

```sql
WITH manana AS (
  SELECT ((now() AT TIME ZONE 'America/Mexico_City')::date + 1) AS d
)
SELECT
  public.norm_partido_team_name(equipo_local_nombre) AS home,
  public.norm_partido_team_name(equipo_visitante_nombre) AS away,
  count(*) AS filas
FROM public.partidos p, manana m
WHERE (p.fecha_kickoff AT TIME ZONE 'America/Mexico_City')::date = m.d
  AND p.estatus != 'cancelado'
GROUP BY 1, 2
HAVING count(*) > 1;
```

**Resultado esperado:** 0 filas.

### 4b. Pronósticos solo en el fixture real

```sql
SELECT
  p.id,
  p.equipo_local_nombre || ' vs ' || p.equipo_visitante_nombre AS partido,
  p.api_football_fixture_id,
  count(pr.id) AS pronosticos
FROM public.partidos p
LEFT JOIN public.pronosticos pr ON pr.partido_id = p.id
WHERE p.id IN (
  'e2cbf043-df00-4a94-b67b-20773d394027',
  '53226829-63f5-4568-9bdc-d6d590cf2f3b'
)
GROUP BY 1, 2, 3
ORDER BY 2;
```

### 4c. Placeholders ya no deben existir

```sql
SELECT id, api_football_fixture_id, equipo_local_nombre, equipo_visitante_nombre
FROM public.partidos
WHERE id IN (
  'cbe00785-7f28-4df4-b00f-c84d905ffea2',
  'c060c557-b453-4ebf-9eb3-ddba09d36e2d'
);
```

**Resultado esperado:** 0 filas.

---

## Alternativa: scripts locales (después de deploy del PR)

Si tienes `.env.local` con credenciales:

```bash
# Solo auditar mañana (vía API producción)
node scripts/audit-dedupe-tomorrow.mjs

# Consolidar vía API
node scripts/audit-dedupe-tomorrow.mjs --consolidate

# Consolidar directo en Supabase (sin deploy del endpoint)
npx tsx scripts/consolidate-dedupe-tomorrow.mjs --consolidate

# Fecha específica
node scripts/audit-dedupe-tomorrow.mjs --date=2026-07-03 --consolidate
```

Variables requeridas en `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo script directo)
- `ADMIN_CARGAR_PARTIDOS_SECRET` (solo script vía API)

---

## Opcional — Corregir marcador antes de consolidar

Si quieres que gane el marcador de la fila **real** en lugar del placeholder, actualiza el placeholder **antes** del Paso 3.

Ejemplo: usuario `aaa99915…` en liga global, Argentina — quieres **3-0** (real) en vez de **2-0** (placeholder):

```sql
UPDATE public.pronosticos
SET goles_local = 3, goles_visitante = 0
WHERE partido_id = 'cbe00785-7f28-4df4-b00f-c84d905ffea2'
  AND liga_id = 'a0000000-0000-4000-8000-000000000001'
  AND usuario_id = 'aaa99915-0487-4605-9dac-5da0f906f7e5';

-- Luego borrar el duplicado en la fila real (opcional; reconcile lo hará igual)
DELETE FROM public.pronosticos
WHERE partido_id = 'e2cbf043-df00-4a94-b67b-20773d394027'
  AND liga_id = 'a0000000-0000-4000-8000-000000000001'
  AND usuario_id = 'aaa99915-0487-4605-9dac-5da0f906f7e5';
```

---

## Referencias en el repo

| Recurso | Ruta |
|---------|------|
| Función SQL de consolidación KO | `supabase/migrations/20260628140000_reconcile_knockout_partido_duplicates.sql` |
| Endpoint admin (PR) | `src/app/api/admin/dedupe-partidos/route.ts` |
| Lib audit/consolidate | `src/lib/partidos/dedupe-partidos-consolidate.ts` |
| PR relacionado | https://github.com/jonyts25/mundial-compas/pull/3 |

---

## Checklist rápido

- [ ] Paso 1: Auditar duplicados (confirmar 2 pares)
- [ ] Paso 2: Verificar kickoffs iguales (alinear si hace falta)
- [ ] Opcional: Corregir marcadores en placeholder si no quieres los actuales
- [ ] Paso 3: `SELECT * FROM public.reconcile_knockout_partido_duplicates();`
- [ ] Paso 4: Verificar 0 duplicados + pronósticos en fixture real
- [ ] Probar en la app: quiniela y calendario muestran un solo partido por encuentro
