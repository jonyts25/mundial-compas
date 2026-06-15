# PILOT-CLEANUP — SQL Review

> **Estado:** SQL listo para revisión humana. **NO aplicado.** **NO ejecutar en producción** sin backup y aprobación.

**Referencia:** `PILOT_CLEANUP_REPORT.md`  
**Predicado pilot:** alineado con `isPilotPartidoMetadata()` en `pilot-config.ts`

---

## Predicado reutilizable

```sql
-- Condición WHERE para partidos piloto
(
  COALESCE(metadata->>'competencia', '') = 'pilot'
  OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
)
```

---

## 1. Backup lógico opcional (SELECT → exportar CSV/JSON)

Ejecutar **antes** de cualquier DELETE. Guardar resultados en almacenamiento seguro.

```sql
-- 1.1 IDs piloto
SELECT id AS partido_id
FROM public.partidos
WHERE (
  COALESCE(metadata->>'competencia', '') = 'pilot'
  OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

-- 1.2 Snapshot partidos pilot
SELECT *
FROM public.partidos
WHERE (
  COALESCE(metadata->>'competencia', '') = 'pilot'
  OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

-- 1.3 Pronósticos asociados
SELECT pr.*
FROM public.pronosticos pr
WHERE pr.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

-- 1.4 Mensajes chat asociados
SELECT mc.*
FROM public.mensajes_chat mc
WHERE mc.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

-- 1.5 Notificaciones asociadas
SELECT n.*
FROM public.notificaciones n
WHERE n.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

-- 1.6 Webhook eventos asociados
SELECT w.*
FROM public.webhook_eventos w
WHERE w.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

-- 1.7 Push silenciados asociados
SELECT ps.*
FROM public.push_partidos_silenciados ps
WHERE ps.partido_id IN (
  SELECT id FROM public.partidos
  WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
     OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);
```

---

## 2. Conteo pre-delete (obligatorio)

```sql
WITH pilot AS (
  SELECT id
  FROM public.partidos
  WHERE (
    COALESCE(metadata->>'competencia', '') = 'pilot'
    OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
  )
)
SELECT 'partidos' AS tabla, COUNT(*) FROM pilot
UNION ALL SELECT 'pronosticos', COUNT(*) FROM public.pronosticos WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'mensajes_chat', COUNT(*) FROM public.mensajes_chat WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'notificaciones', COUNT(*) FROM public.notificaciones WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'webhook_eventos', COUNT(*) FROM public.webhook_eventos WHERE partido_id IN (SELECT id FROM pilot)
UNION ALL SELECT 'push_partidos_silenciados', COUNT(*) FROM public.push_partidos_silenciados WHERE partido_id IN (SELECT id FROM pilot);
```

**Stop si `partidos = 0`** (nada que limpiar) o si conteos no coinciden con expectativa manual.

---

## 3. DELETE — tablas dependientes (opcional explícito)

⛔ **NO EJECUTAR AÚN**

Estos pasos son **opcionales** si se prefiere limpieza explícita antes del DELETE padre. Si se omite §3, §4 CASCADE cubre la mayoría.

```sql
-- ⛔ NO EJECUTAR AÚN
-- BEGIN;

-- 3.1 Pronósticos (también se eliminan por CASCADE al borrar partido)
-- DELETE FROM public.pronosticos
-- WHERE partido_id IN (
--   SELECT id FROM public.partidos
--   WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
--      OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
-- );

-- 3.2 Mensajes chat
-- DELETE FROM public.mensajes_chat
-- WHERE partido_id IN (
--   SELECT id FROM public.partidos
--   WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
--      OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
-- );

-- 3.3 Push silenciados
-- DELETE FROM public.push_partidos_silenciados
-- WHERE partido_id IN (
--   SELECT id FROM public.partidos
--   WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
--      OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
-- );

-- 3.4 Notificaciones (evita filas con partido_id NULL)
-- DELETE FROM public.notificaciones
-- WHERE partido_id IN (
--   SELECT id FROM public.partidos
--   WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
--      OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
-- );

-- 3.5 Webhook eventos (evita filas con partido_id NULL)
-- DELETE FROM public.webhook_eventos
-- WHERE partido_id IN (
--   SELECT id FROM public.partidos
--   WHERE COALESCE(metadata->>'competencia', '') = 'pilot'
--      OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
-- );

-- COMMIT;
```

---

## 4. DELETE — partidos piloto

⛔ **NO EJECUTAR AÚN**

```sql
-- ⛔ NO EJECUTAR AÚN
-- BEGIN;

-- DELETE FROM public.partidos
-- WHERE (
--   COALESCE(metadata->>'competencia', '') = 'pilot'
--   OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
-- );

-- COMMIT;
```

**Efectos FK automáticos al DELETE partidos:**

| Tabla | Comportamiento |
|-------|----------------|
| `pronosticos` | DELETE CASCADE |
| `mensajes_chat` | DELETE CASCADE |
| `push_partidos_silenciados` | DELETE CASCADE |
| `notificaciones` | SET NULL en `partido_id` (si no se ejecutó §3.4) |
| `webhook_eventos` | SET NULL en `partido_id` (si no se ejecutó §3.5) |

---

## 5. Verificación post-cleanup

```sql
-- 5.1 Cero partidos pilot
SELECT COUNT(*) AS debe_ser_cero
FROM public.partidos
WHERE (
  COALESCE(metadata->>'competencia', '') = 'pilot'
  OR COALESCE((metadata->'pilot')::boolean, FALSE) = TRUE
);

-- 5.2 Cero dependencias con FK a partidos pilot inexistentes
SELECT
  (SELECT COUNT(*) FROM public.pronosticos pr
   LEFT JOIN public.partidos p ON p.id = pr.partido_id
   WHERE p.id IS NULL) AS pronosticos_huerfanos,
  (SELECT COUNT(*) FROM public.mensajes_chat mc
   LEFT JOIN public.partidos p ON p.id = mc.partido_id
   WHERE mc.partido_id IS NOT NULL AND p.id IS NULL) AS chat_huerfano,
  (SELECT COUNT(*) FROM public.push_partidos_silenciados ps
   LEFT JOIN public.partidos p ON p.id = ps.partido_id
   WHERE p.id IS NULL) AS silenciados_huerfanos;
-- Esperado: 0, 0, 0

-- 5.3 Resumen partidos restantes
SELECT estatus, COUNT(*) AS cnt
FROM public.partidos
GROUP BY estatus
ORDER BY estatus;
```

---

## 6. Rollback

**Requiere backup/export previo (§1).** No hay rollback transaccional después de `COMMIT`.

### Restauración manual desde backup

Orden de INSERT inverso al DELETE:

1. `INSERT INTO partidos` (restaurar filas exportadas en §1.2)
2. `INSERT INTO pronosticos` (§1.3)
3. `INSERT INTO mensajes_chat` (§1.4)
4. `INSERT INTO notificaciones` (§1.5)
5. `INSERT INTO webhook_eventos` (§1.6)
6. `INSERT INTO push_partidos_silenciados` (§1.7)

Respetar UUIDs originales para mantener integridad referencial.

### Alternativa infra

- Supabase **Point-in-Time Recovery** al timestamp anterior al cleanup (restaura proyecto completo).

---

## 7. Orden de ejecución propuesto (cuando se apruebe)

| Paso | Acción | Entorno |
|------|--------|---------|
| 1 | §1 Backup lógico | Staging → luego prod |
| 2 | §2 Conteo pre-delete | Staging |
| 3 | Revisión humana lista §1.2 | — |
| 4 | §3 (opcional) DELETE dependientes | Staging |
| 5 | §4 DELETE partidos pilot | Staging |
| 6 | §5 Verificación | Staging |
| 7 | Smoke tests app (home, quiniela, leaderboard) | Staging |
| 8 | Repetir 1–7 en prod con ventana | Prod |
| 9 | `PILOT_MODE_ENABLED=false` | Railway env |
| 10 | Apply Migration 0 | Ver `MIGRATION_0_READY_REPORT.md` |

---

## 8. Notas

- **No crear migration Supabase** para pilot cleanup — es operación one-shot de datos, no DDL.
- Si staging y prod divergen en conteos pilot, ejecutar diagnóstico por separado.
- Documentación legacy `docs/PILOT_CHAMPIONS.md` sugiere `DELETE FROM partidos WHERE metadata->>'competencia' = 'pilot'` — ampliar al predicado canónico (§predicado) por seguridad.

---

*SQL de revisión — no aplicado.*
