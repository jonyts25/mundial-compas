# PRODUCTION EXECUTION CHECKLIST

> **Uso:** Imprimir o marcar en ticket. **Un solo entorno = producción.**  
> **Responsable ejecución:** _______________  
> **Fecha ventana:** _______________  
> **Hora inicio:** _______________

**Referencias:** `PILOT_CLEANUP_EXECUTION_PLAN.md`, `PRODUCTION_READINESS_REVIEW.md`, `MIGRATION_0_SMOKE_TESTS.md`

---

## ANTES

### Backup y preparación

- [ ] **PITR Supabase** confirmado activo; timestamp anotado: _______________
- [ ] **Backup lógico pilot** exportado (§3.4) — o N/A si `partidos_pilot = 0`
- [ ] **Conteos pre-flight** ejecutados y guardados (§3.3)
- [ ] **Lista partidos pilot** revisada manualmente (§3.2) — OK humano: _______________
- [ ] **Dump / export `partidos`** (recomendado) guardado en: _______________
- [ ] **Git tag** `pre-migration-0-YYYYMMDD` creado en commit desplegado: _______________

### Infraestructura

- [ ] **Railway verde** — Mundial Compas Service Online
- [ ] **sync-live-cron** — documentado estado: ☐ pausar ☐ mantener
- [ ] **livescore-relay** — documentado estado: ☐ pausar ☐ mantener
- [ ] **sync-calendar-cron** — ☐ **PAUSADO** (recomendado)
- [ ] **`PILOT_MODE_ENABLED`** plan post-cleanup → `false`

### Tráfico y comunicación

- [ ] **Ventana bajo tráfico** acordada (evitar partido en vivo si posible)
- [ ] **Usuarios mínimos activos** — evitar hora pico quiniela
- [ ] **Rollback owner** asignado: _______________
- [ ] **Segundo par de ojos** disponible durante ventana: _______________

### Código desplegado

- [ ] Commit con migrations incluido en deploy: _______________
- [ ] App **no requiere** deploy nuevo para M0 (aditivo) — confirmado
- [ ] `npx tsc --noEmit` OK en commit desplegado

---

## DURANTE

### Fase A — Pilot cleanup

- [ ] SQL Editor / psql con rol adecuado (service/postgres)
- [ ] `BEGIN;`
- [ ] DELETE `notificaciones` pilot (opcional recomendado)
- [ ] DELETE `webhook_eventos` pilot (opcional recomendado)
- [ ] DELETE `partidos` pilot
- [ ] Verificar rowcount esperado vs §3.3
- [ ] `COMMIT;`
- [ ] Post-check: `pilot_restantes = 0` (§3.6)
- [ ] Post-check: huérfanos = 0

**Si FAIL en Fase A:** `ROLLBACK;` → abortar ventana → ver rollback criteria

---

### Fase B — Migration 0

- [ ] Apply `20260615120000_migration_0_competitions_seasons.sql`
  - ☐ Supabase CLI `db push` / migration up
  - ☐ SQL Editor sección por sección
- [ ] Verificar G1–G9 (`MIGRATION_0_SMOKE_TESTS.md` sección G)
- [ ] `partidos_sin_season = 0`
- [ ] `partidos_wc2026 = partidos_total`

**Si FAIL en Fase B:** no aplicar 0b; evaluar rollback §9 PRODUCTION_READINESS_REVIEW

---

### Fase C — Migration 0b (RLS)

- [ ] Apply `20260615130000_migration_0b_competitions_seasons_rls.sql`
- [ ] Verificar `relrowsecurity = true` en competitions + seasons
- [ ] Verificar 2 policies SELECT authenticated

**Si FAIL en Fase C:** rollback RLS only; M0 data intacta

---

### Fase D — Post-apply env

- [ ] `PILOT_MODE_ENABLED=false` en Railway
- [ ] Reactivar **sync-calendar-cron** (si se pausó)
- [ ] Confirmar sync-live-cron / relay según plan ANTES

---

## DESPUÉS

### Smoke tests (P0 obligatorio)

| ID | Prueba | PASS | FAIL |
|----|--------|------|------|
| A1 | Home dashboard | ☐ | ☐ |
| A2 | Carrusel quinielas | ☐ | ☐ |
| B2 | Guardar pronóstico | ☐ | ☐ |
| B3 | Editar pronóstico | ☐ | ☐ |
| C1 | Pantalla partido | ☐ | ☐ |
| C2 | Pitoniso | ☐ | ☐ |
| C3 | Multi-quiniela | ☐ | ☐ |
| D2 | Leaderboard grupo | ☐ | ☐ |
| D4 | Leaderboard global | ☐ | ☐ |
| G4 | SQL partidos_sin_season = 0 | ☐ | ☐ |

Detalle completo: `MIGRATION_0_SMOKE_TESTS.md`

---

### Monitoreo (24–48h)

- [ ] Railway logs sin errores SQL `season_id` / `competitions`
- [ ] PostHog: `page_view`, `match_view`, `pronostico_saved` fluyen
- [ ] Query diaria NULL season_id (ver `MIGRATION_0_5_SEASON_INGESTION_PLAN.md` §7)
- [ ] Leaderboard coherente vs baseline pre-ventana
- [ ] Push / notificaciones sin spike de errores

---

### Rollback criteria (cuándo revertir)

Ejecutar rollback si **cualquiera**:

| # | Criterio | Acción |
|---|----------|--------|
| R1 | Smoke P0 **≥2 FAIL** | Rollback M0 §9 + evaluar PITR |
| R2 | Error 500 masivo en home/quiniela/partido | Rollback M0 o PITR |
| R3 | `partidos_sin_season` > 5% total post-apply | Re-run backfill; si persiste rollback |
| R4 | RPC leaderboard roto | Rollback M0 (no debería ocurrir) |
| R5 | Pérdida datos no-pilot confirmada | **PITR inmediato** |

**Rollback orden:**

1. Migration 0b RLS (reversible fácil)
2. Migration 0 DDL (§9 PRODUCTION_READINESS_REVIEW)
3. Pilot cleanup **no reversible** sin backup — usar PITR si cleanup erróneo

---

### Cierre ventana

- [ ] Todos P0 PASS
- [ ] Monitoreo 1h post-ventana sin alertas
- [ ] Ticket actualizado con conteos y timestamps
- [ ] Plan Migration 0.5 ingest programado: _______________

**Firma cierre:** _______________ **Fecha/hora:** _______________

---

*Checklist humano — no sustituye juicio operativo.*
