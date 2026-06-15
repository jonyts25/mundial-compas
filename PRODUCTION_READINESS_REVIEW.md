# PRODUCTION READINESS REVIEW

> **Contexto:** Único entorno = **Supabase producción**. No existe staging.  
> **Estado:** Revisión final antes de ejecutar. **Nada aplicado** en esta fase.

**Referencias:** `PILOT_CLEANUP_*`, `MIGRATION_0_*`, `MIGRATION_0B_RLS_PATCH.md`, `MIGRATION_0_5_SEASON_INGESTION_PLAN.md`

---

## Resumen ejecutivo

| Operación | Tablas afectadas | Reversible sin backup |
|-----------|------------------|---------------------|
| Pilot cleanup | **6** (DELETE datos) | ❌ No |
| Migration 0 | **3** (2 CREATE + 1 ALTER) | ⚠️ Parcial (rollback manual) |
| Migration 0b | **2** (RLS only) | ✅ Sí |

---

## 1. ¿Cuántas tablas toca Pilot Cleanup?

**6 tablas** con impacto directo:

| # | Tabla | Operación |
|---|-------|-----------|
| 1 | `partidos` | DELETE filas pilot |
| 2 | `pronosticos` | DELETE CASCADE (automático) o previo explícito |
| 3 | `mensajes_chat` | DELETE CASCADE |
| 4 | `push_partidos_silenciados` | DELETE CASCADE |
| 5 | `notificaciones` | DELETE explícito recomendado (alternativa: SET NULL al borrar partido) |
| 6 | `webhook_eventos` | DELETE explícito recomendado (alternativa: SET NULL) |

**Tablas NO tocadas:** `usuarios`, `ligas_privadas`, `liga_miembros`, `datos_mamalones`, `push_subscriptions`, `liquidacion_pagos`, `grupo_eliminacion_solicitudes`, `competitions`/`seasons` (aún no existen pre-M0).

---

## 2. ¿Cuántas tablas toca Migration 0?

**3 tablas:**

| # | Tabla | Operación |
|---|-------|-----------|
| 1 | `competitions` | **CREATE** + seed 1 fila |
| 2 | `seasons` | **CREATE** + seed 1 fila |
| 3 | `partidos` | **ALTER** ADD COLUMN `season_id` + UPDATE backfill |

**Sin cambios:** todas las demás tablas del schema (30 migrations previas).

---

## 3. ¿Qué FKs nuevas se crean?

| FK | Desde | Hacia | ON DELETE |
|----|-------|-------|-----------|
| `seasons.competition_id` → `competitions.id` | `seasons` | `competitions` | **RESTRICT** |
| `partidos_season_id_fkey` | `partidos.season_id` | `seasons.id` | **RESTRICT** |

**Total: 2 FKs nuevas.**

No se crean FKs hacia `pronosticos`, `mensajes_chat`, ni otras tablas existentes.

---

## 4. ¿Qué queries actuales podrían verse afectadas?

Migration 0 es **aditiva** — la app **no lee** `season_id`. Impacto funcional esperado: **ninguno**.

| Área | Archivos clave | Impacto |
|------|----------------|---------|
| Home / dashboard | `home-dashboard-queries.ts` | Sin impacto — filtra pilot por metadata |
| Calendario | `calendario-queries.ts` | Sin impacto |
| Quiniela | `quiniela/queries.ts`, `actions.ts` | Sin impacto |
| Partido / Pitoniso | `detail-queries.ts`, `pitoniso-queries.ts` | Sin impacto |
| Leaderboard | `leaderboard/queries.ts`, RPC `tabla_liderato_quiniela` | Sin impacto — JOIN por `partido_id` |
| Posiciones | `standings/posiciones-queries.ts` | Sin impacto |
| Chat | `chat-queries.ts` | Sin impacto |
| Perfiles | `profile-data.ts` | Sin impacto |

**Riesgo indirecto:** SELECT `*` en `partidos` sin lista explícita de columnas — sigue funcionando (columna extra nullable).

**Post-M0 monitoreo:** ninguna query filtra por `season_id` aún → mezcla de NULLs futuros invisible hasta Migration 0.5.

---

## 5. ¿Qué cron jobs podrían verse afectados?

| Servicio Railway | Script / route | Impacto | Notas |
|------------------|----------------|---------|-------|
| **sync-live-cron** | `sync-live-cron.mjs` → `/api/admin/sync-live` | **Bajo** | UPDATE estatus/marcador; no toca season_id |
| **livescore-relay** | `apifootball-livescore-relay.mjs` | **Bajo** | Relay → sync live |
| **sync-calendar-cron** | `sync-calendar-cron.mjs` | **Medio** | UPSERT partidos nuevos **sin** season_id post-M0 |
| **sync-lineups-cron** | `sync-lineups-cron.mjs` | **Bajo** | UPDATE metadata alineaciones |

**Recomendación ventana:** pausar **sync-calendar-cron** durante apply M0; reactivar tras smoke. sync-live puede continuar (solo UPDATE).

---

## 6. ¿Qué scripts de ingest podrían verse afectados?

| Script | Impacto | Detalle |
|--------|---------|---------|
| `recargar-mundial.mjs` | **Medio** | Upsert sin `season_id` → NULL en filas nuevas |
| `cargar-partidos` (admin API) | **Medio** | Idem |
| `cargar-pilot-*.mjs` | **Alto** | Reintroducirían pilot — **no ejecutar** post-cleanup |
| `sync-calendar-cron.mjs` | **Medio** | Cron upsert |
| `backfill-partidos-grupo.mjs` | **Bajo** | Solo metadata grupo |
| `replay-*` | **Bajo** | QA manual — no prod |

Ver plan: `MIGRATION_0_5_SEASON_INGESTION_PLAN.md`.

---

## 7. ¿Qué pasa si migration falla a mitad?

Migration 0 es **un archivo** Supabase; apply es transaccional **por statement** en CLI (cada migration en una transacción).

| Punto de fallo | Estado BD | App |
|----------------|---------|-----|
| Falla en CREATE `competitions` | Sin tablas nuevas | OK |
| Falla en CREATE `seasons` | Solo `competitions` | OK — app no las usa |
| Falla en seed INSERT | Tablas vacías o parciales | OK |
| Falla en ADD COLUMN | Sin `season_id` | OK |
| Falla en ADD FK | Columna sin FK | OK — nullable sin constraint |
| Falla en UPDATE backfill | Columna + FK; algunos NULL | OK — app no lee columna |
| Falla post-backfill | Parcial backfill | Monitorear NULLs; re-run UPDATE idempotente |

**Acción:** `supabase migration repair` + corregir error + re-aplicar. Guards idempotentes (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) permiten reintento local.

**En SQL Editor manual:** usar `BEGIN`/`COMMIT` por sección; no mezclar cleanup + M0 en una transacción gigante.

---

## 8. ¿Qué pasa si cleanup falla a mitad?

Cleanup usa transacción explícita (`BEGIN`/`COMMIT`):

| Escenario | Resultado |
|-----------|-----------|
| DELETE notificaciones OK; DELETE partidos **falla** | `ROLLBACK` → sin cambios |
| DELETE partidos OK; **COMMIT** falla | Raro — verificar estado; posible partial si autocommit |
| DELETE sin transacción (error humano) | **Crítico** — partial delete; pronósticos huérfanos o partidos sin dependencias |

**Mitigación:** siempre `BEGIN`/`COMMIT`; verificar conteos pre/post; nunca DELETE sin §3.3 pre-flight.

Si falla a mitad **sin** rollback: ejecutar diagnóstico huérfanos (§3.6 execution plan); completar DELETE manual o restaurar backup.

---

## 9. ¿Cuál es el rollback real?

### Pilot cleanup

| Método | Viabilidad |
|--------|------------|
| Backup lógico §3.4 (`PILOT_CLEANUP_EXECUTION_PLAN.md`) | ✅ INSERT inverso con mismos UUIDs |
| Supabase PITR | ✅ Restore proyecto completo a timestamp pre-cleanup |
| Sin backup | ❌ Irrecuperable — recrear pilot con scripts (nuevos UUIDs) |

### Migration 0

```sql
-- Orden inverso (MIGRATION_0_READY_REPORT.md §7)
UPDATE partidos SET season_id = NULL WHERE season_id = 'b0000000-…000002';
ALTER TABLE partidos DROP CONSTRAINT IF EXISTS partidos_season_id_fkey;
ALTER TABLE partidos DROP COLUMN IF EXISTS season_id;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS competitions;
```

**Válido si:** app no depende de `season_id` (true hoy). **Datos seed perdidos** si DROP tables.

### Migration 0b

```sql
DROP POLICY ...; ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
```

✅ Reversible sin pérdida de datos.

---

## 10. ¿Qué backup recomienda antes de ejecutar?

### Obligatorio

| # | Backup | Cómo |
|---|--------|------|
| 1 | **Supabase PITR / daily backup** | Dashboard → Settings → confirmar PITR activo; anotar timestamp pre-ventana |
| 2 | **Backup lógico pilot** | Export CSV/JSON §3.4 execution plan (si `partidos_pilot > 0`) |
| 3 | **Snapshot conteos** | Guardar output §3.3 pre-flight + G-queries baseline |

### Recomendado

| # | Backup | Cómo |
|---|--------|------|
| 4 | **Dump tabla partidos** | `pg_dump -t partidos` o Supabase export |
| 5 | **Git tag release** | `git tag pre-migration-0-$(date)` en commit desplegado |
| 6 | **Railway env snapshot** | Documentar vars; `PILOT_MODE_ENABLED` planificado |

### Opcional

| # | Backup |
|---|--------|
| 7 | Export `pronosticos` count por liga (baseline leaderboard) |
| 8 | PostHog screenshot métricas 24h previas |

**Tiempo mínimo entre backup y ventana:** < 1h (PITR) o export inmediato antes de DELETE.

---

## Matriz de riesgo producción (sin staging)

| Riesgo | Mitigación |
|--------|------------|
| Sin dry-run en staging | Backup PITR + ventana bajo tráfico + smoke inmediato |
| Pilot mezclado en backfill | Cleanup obligatorio primero |
| RLS gap | Migration 0b misma ventana |
| NULL season_id post-cron | Pausar sync-calendar; monitoreo G4 |
| Rollback parcial | Documentar §9; no improvisar DROP |

---

*Revisión pre-producción — no ejecutada.*
