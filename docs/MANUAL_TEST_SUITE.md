# Mundial Compas — Guía de Pruebas Manuales

**Versión:** 2026-05-18  
**Stack:** Next.js 16 · Supabase · apifootball.com  
**Liga global:** `a0000000-0000-4000-8000-000000000001`

---

## 0. Pre-requisitos globales

| Requisito | Cómo verificar |
|-----------|----------------|
| `.env.local` completo | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `API_FOOTBALL_KEY`, `ADMIN_CARGAR_PARTIDOS_SECRET` |
| Migraciones SQL aplicadas | Ver checklist §1 — todas en `supabase/migrations/` |
| Realtime habilitado | `partidos` y `mensajes_chat` en publicación `supabase_realtime` (migración `20260518140000`) |
| Usuario autenticado | Login en `/login`; debe existir fila en `usuarios` y `liga_miembros` |
| Partidos cargados | `POST /api/admin/cargar-partidos` con Bearer secret |
| `npm run build` sin errores | Confirma que el proyecto compila |

**Comando útil (carga de partidos):**

```bash
curl -X POST "http://localhost:3000/api/admin/cargar-partidos" \
  -H "Authorization: Bearer TU_ADMIN_CARGAR_PARTIDOS_SECRET"
```

---

## 1. Checklist de estado actual (auditoría)

### 1.1 Home / Calendario

| Pieza | Archivo(s) | Estado |
|-------|------------|--------|
| Página Home | `src/app/(app)/page.tsx` | ✅ |
| Layout app | `src/app/(app)/layout.tsx` | ✅ |
| Header + logout | `src/components/home/AppHeader.tsx`, `LogoutButton.tsx` | ✅ |
| Hero (vivo / dato mamalón) | `src/components/home/HeroSection.tsx`, `DatoMamalónCard.tsx` | ✅ |
| Calendario por fechas CDMX | `src/components/home/CalendarioPartidos.tsx` | ✅ |
| Tarjeta partido + Realtime marcador | `src/components/home/PartidoCard.tsx`, `MarcadorLive.tsx` | ✅ |
| FAB Quiniela + Liderato | `src/components/home/QuinielaFab.tsx` | ✅ |
| Queries Home | `src/lib/partidos/queries.ts` | ✅ |
| Queries calendario + pronósticos | `src/lib/partidos/calendario-queries.ts` (service role) | ✅ |
| Banderas / ISO | `src/lib/utils.ts`, `src/lib/teams/flags.ts` | ✅ |

**Ruta:** `/`

---

### 1.2 Quiniela

| Pieza | Archivo(s) | Estado |
|-------|------------|--------|
| Página | `src/app/(app)/quiniela/page.tsx` | ✅ |
| Lista + filtros | `src/components/quiniela/QuinielaList.tsx` | ✅ |
| Fila pronóstico + inputs | `src/components/quiniela/PronosticoRow.tsx` | ✅ |
| Candado 5 min (UI) | `src/lib/quiniela/lock.ts` | ✅ |
| Guardar pronóstico | `src/lib/quiniela/actions.ts` | ✅ |
| Queries | `src/lib/quiniela/queries.ts` (service role) | ✅ |

**Ruta:** `/quiniela`

**Nota de auditoría:** El candado de **5 minutos** está en UI (`isPronosticoLocked`). El trigger SQL `trg_bloquear_pronostico_kickoff` bloquea en el **pitazo** (`now() >= fecha_kickoff`), no a T-5. `savePronostico` valida `estatus` programado/aplazado pero no T-5.

---

### 1.3 Detalle del partido / Chat

| Pieza | Archivo(s) | Estado |
|-------|------------|--------|
| Página detalle | `src/app/(app)/partidos/[id]/page.tsx` | ✅ |
| Header marcador + banderas | `src/components/partidos/PartidoHeader.tsx` | ✅ |
| Recordatorio pronóstico | `src/components/partidos/PronosticoReminder.tsx` | ✅ |
| Chat Realtime | `src/components/partidos/ChatPartido.tsx` | ✅ |
| Ventana chat T-10 | `src/lib/partidos/chat-window.ts` | ✅ |
| Historial chat (servidor) | `src/lib/partidos/chat-queries.ts` | ✅ |
| Detalle page data | `src/lib/partidos/detail-queries.ts` | ✅ |
| Enviar / reportar / moderar | `src/lib/partidos/chat-actions.ts` | ✅ |
| Tipos chat | `src/types/chat.ts` | ✅ |

**Ruta:** `/partidos/[id]`

---

### 1.4 Leaderboard

| Pieza | Archivo(s) | Estado |
|-------|------------|--------|
| Página | `src/app/(app)/leaderboard/page.tsx` | ✅ |
| Tabla UI | `src/components/leaderboard/Leaderboard.tsx` | ✅ |
| Query RPC | `src/lib/leaderboard/queries.ts` | ✅ |
| Función SQL desempate | `supabase/migrations/20260518170000_tabla_liderato.sql` | ✅ (requiere aplicar en Supabase) |

**Ruta:** `/leaderboard`

---

### 1.5 Admin API / Webhooks / Carga apifootball

| Pieza | Archivo(s) | Estado |
|-------|------------|--------|
| Cargar partidos | `src/app/api/admin/cargar-partidos/route.ts` | ✅ |
| Cliente apifootball | `src/lib/apifootball/client.ts`, `fetch-world-cup-events.ts` | ✅ |
| Mapeo evento → partido | `src/lib/apifootball/map-event-to-partido.ts` | ✅ |
| Webhook entrada | `src/app/api/webhooks/api-football/route.ts` | ✅ |
| Handlers gol/estatus | `src/lib/api-football/handlers/` | ✅ |
| Admin Supabase | `src/lib/supabase/admin.ts` | ✅ |
| Auth middleware | `src/middleware.ts` | ✅ |

**Rutas API:** `POST /api/admin/cargar-partidos`, `POST /api/webhooks/api-football`

---

### 1.6 Migraciones Supabase (orden sugerido)

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `20260518000001_initial_schema.sql` | Esquema base, RLS, puntos, triggers |
| 2 | `20260518120000_fix_liga_miembros_rls_recursion.sql` | Fix RLS `liga_miembros` |
| 3 | `20260518140000_realtime_chat_partidos.sql` | Realtime `partidos` + `mensajes_chat` |
| 4 | `20260518150000_chat_moderacion.sql` | Reportes + RPC moderación |
| 5 | `20260518160000_limpieza_mensajes_chat_24h.sql` | Limpieza 24h (pg_cron opcional) |
| 6 | `20260518170000_tabla_liderato.sql` | `tabla_liderato_quiniela()` |

**Seeds:** `seed_datos_mamalones.sql`, `sample_partidos_hoy.sql`

---

### 1.7 Gaps conocidos (no bloquean QA, sí documentar)

- [ ] Candado T-5 solo en cliente; BD bloquea en pitazo exacto.
- [ ] `savePronostico` no valida T-5 en servidor (solo UI).
- [ ] Webhook apifootball vs API-Sports: ruta preparada para payloads tipo API-Football; integración apifootball en vivo puede requerir adaptador adicional.
- [ ] Página detalle partido: validar que `PartidoCard` en Home muestre visitante (revisar en UI).

---

## 2. Casos de prueba críticos

### Caso 1 — Candado de la quiniela (T-5)

**Objetivo:** Validar ventana editable vs bloqueada en UI y resistencia básica en backend.

**Datos de entrada:**

- Un `partido_id` con `estatus = 'programado'`.
- Usuario A autenticado, miembro de liga global.
- Ajustar `fecha_kickoff` en Supabase (ver §3).

---

#### 1A — Más de 5 minutos antes del pitazo (editable)

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | En SQL: `fecha_kickoff = now() + interval '30 minutes'` para el partido de prueba | Partido programado a futuro |
| 2 | Ir a `/quiniela` | Lista carga sin error |
| 3 | Localizar el partido; inputs de goles habilitados | No aparece "🔒 Cerrado"; botón "Guardar pronóstico" activo al cambiar marcador |
| 4 | Ingresar ej. `2` - `1` y guardar | Mensaje "Guardado ✓" |
| 5 | Ir a `/partidos/{id}` | Tarjeta **✓ Tu pronóstico asegurado** con cajas de marcador; botón **Modificar** visible |
| 6 | Volver a `/quiniela`, cambiar a `3` - `0`, actualizar | Guardado exitoso |

---

#### 1B — Menos de 5 minutos antes del pitazo (UI congelada)

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | En SQL: `fecha_kickoff = now() + interval '3 minutes'` | Dentro de ventana de candado |
| 2 | Recargar `/quiniela` (esperar hasta 30s o F5) | Inputs deshabilitados; badge "🔒 Cerrado" |
| 3 | Intentar clic en guardar | Botón deshabilitado o sin efecto |
| 4 | Ir a `/partidos/{id}` | Tarjeta **🔒 Tu pronóstico asegurado** (estilo congelado); **sin** botón Modificar |
| 5 | Si nunca guardó pronóstico: misma ventana | Texto **🚫 No registraste pronóstico… (Quiniela bloqueada)** |

---

#### 1C — Rechazo de insert/update (backend)

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Con `fecha_kickoff = now() + interval '3 minutes'`, abrir DevTools → intentar guardar vía UI | UI no envía (deshabilitado) |
| 2 | En SQL: `fecha_kickoff = now() - interval '1 minute'` (partido ya “inició” según trigger) | — |
| 3 | Si aún hay UI abierta, intentar guardar pronóstico nuevo desde `/quiniela` vía consola llamando a la action (opcional) | Error de Postgres o mensaje de error: pronóstico no modificable |
| 4 | Verificar en Supabase Table Editor: insert manual en `pronosticos` | Debe fallar con excepción del trigger si `now() >= fecha_kickoff` |

**Comportamiento actual documentado:**

| Capa | Bloqueo a T-5 | Bloqueo en pitazo |
|------|----------------|-------------------|
| UI (`PronosticoRow`, `PronosticoReminder`) | ✅ | ✅ |
| `savePronostico` (server action) | ❌ | Parcial (vía `estatus`) |
| Trigger `pronosticos_before_insert_update_lock` | ❌ | ✅ |

---

### Caso 2 — Ventana y persistencia del chat

**Objetivo:** Chat T-10, historial al volver, moderación admin.

**Usuarios:** Usuario A (normal), Usuario B (admin en `liga_miembros.rol = 'admin'`).

---

#### 2A — Input bloqueado hasta T-10

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | SQL: `fecha_kickoff = now() + interval '20 minutes'` en partido P | — |
| 2 | Usuario A → `/partidos/P` | Chat muestra historial (si hay); input **deshabilitado** |
| 3 | Placeholder del input | `🔒 El chat se abrirá 10 minutos antes del pitazo inicial` |
| 4 | SQL: `fecha_kickoff = now() + interval '8 minutes'` | — |
| 5 | Recargar página (o esperar 30s) | Input **habilitado**; placeholder "Escribe al grupo…" |
| 6 | Enviar mensaje "Hola compas" | Aparece en lista; sin error |

---

#### 2B — Persistencia al navegar

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | En partido con chat abierto, enviar "Mensaje persistencia 123" | Visible en chat |
| 2 | Ir a `/` (Home) | Home carga |
| 3 | Volver a `/partidos/{id}` del mismo partido | Mensaje **sigue visible** en historial |
| 4 | Abrir otra pestaña incógnito con Usuario B | Mismo mensaje visible (misma liga) |

**Si falla persistencia:** verificar migración moderación aplicada; revisar consola por error RPC/SQL; confirmar `fetchMensajesChatHistorial` en red (datos en HTML/RSC).

---

#### 2C — Moderación (reporte + admin)

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Usuario A envía mensaje ofensivo de prueba | — |
| 2 | Usuario B (no autor) pasa mouse / ve 🚩 en móvil | Botón reportar visible |
| 3 | Clic en 🚩 | `conteo_reportes` +1; `reportado = true` en BD |
| 4 | Usuario Admin recarga chat | Mensaje con **borde rojo**; badges "N reportes"; botones **Aprobar** / **Eliminar** |
| 5 | Clic **Aprobar** | `reportado = false`, `conteo_reportes = 0`; borde rojo desaparece (Realtime o al recargar) |
| 6 | Reportar de nuevo → **Eliminar** | `oculto = true`; contenido reemplazado; usuarios normales ya no ven el mensaje |

**Promover admin (SQL):**

```sql
UPDATE public.liga_miembros
SET rol = 'admin'
WHERE liga_id = 'a0000000-0000-4000-8000-000000000001'
  AND usuario_id = 'UUID_DEL_MODERADOR';
```

---

### Caso 3 — Desempate en Leaderboard

**Objetivo:** Con dos usuarios empatados en puntos totales, gana quien tenga más exactos, luego tendencias, luego antigüedad.

**Pre-requisito:** Migración `20260518170000_tabla_liderato.sql` aplicada.

---

#### 3A — Preparar datos de prueba en SQL

```sql
-- 1) Identificar dos usuarios miembros (reemplaza UUIDs)
-- SELECT usuario_id, joined_at FROM liga_miembros
-- WHERE liga_id = 'a0000000-0000-4000-8000-000000000001';

-- 2) Crear o usar dos partidos FINALIZADOS con marcador real
-- Partido A: resultado 2-1
UPDATE public.partidos
SET estatus = 'finalizado', marcador_local = 2, marcador_visitante = 1,
    fecha_kickoff = now() - interval '2 days'
WHERE id = 'PARTIDO_A_UUID';

-- Partido B: resultado 0-0
UPDATE public.partidos
SET estatus = 'finalizado', marcador_local = 0, marcador_visitante = 0,
    fecha_kickoff = now() - interval '1 day'
WHERE id = 'PARTIDO_B_UUID';

-- 3) Usuario 1 (más antiguo): 3+3 = 6 pts, 2 exactos, 0 tendencias
INSERT INTO public.pronosticos (liga_id, usuario_id, partido_id, goles_local, goles_visitante, puntos)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'USER_1_UUID', 'PARTIDO_A_UUID', 2, 1, 3),
  ('a0000000-0000-4000-8000-000000000001', 'USER_1_UUID', 'PARTIDO_B_UUID', 0, 0, 3)
ON CONFLICT (liga_id, usuario_id, partido_id) DO UPDATE
SET goles_local = EXCLUDED.goles_local, goles_visitante = EXCLUDED.goles_visitante, puntos = EXCLUDED.puntos;

-- 4) Usuario 2 (más nuevo): 3+1 = 4 pts... para empatar a 6: añadir 1 tendencia + 1 exacto
-- Exacto en A (3) + tendencia en B (1-1 predicho 1-0 = 1 pt) + otro exacto en partido C si hace falta
-- Simpler: User2 → exacto A (3) + tendencia B (1 pt) + exacto en partido C (3) = 7... 
-- Mejor diseño para EMPATE en total con desempate por exactos:

-- Usuario 2: 3 + 3 = 6 pts pero solo 1 exacto (tendencia en el otro)
INSERT INTO public.pronosticos (liga_id, usuario_id, partido_id, goles_local, goles_visitante, puntos)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'USER_2_UUID', 'PARTIDO_A_UUID', 2, 1, 3),
  ('a0000000-0000-4000-8000-000000000001', 'USER_2_UUID', 'PARTIDO_B_UUID', 1, 0, 1)
ON CONFLICT (liga_id, usuario_id, partido_id) DO UPDATE
SET goles_local = EXCLUDED.goles_local, goles_visitante = EXCLUDED.goles_visitante, puntos = EXCLUDED.puntos;

-- Asegurar joined_at: User1 más antiguo que User2
UPDATE public.liga_miembros SET joined_at = '2026-01-01' WHERE usuario_id = 'USER_1_UUID' AND liga_id = 'a0000000-0000-4000-8000-000000000001';
UPDATE public.liga_miembros SET joined_at = '2026-06-01' WHERE usuario_id = 'USER_2_UUID' AND liga_id = 'a0000000-0000-4000-8000-000000000001';
```

---

#### 3B — Verificación en UI

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Ejecutar en SQL Editor: `SELECT * FROM tabla_liderato_quiniela('a0000000-0000-4000-8000-000000000001');` | USER_1 arriba de USER_2 (mismo total 6, más exactos) |
| 2 | Abrir `/leaderboard` | Mismo orden en tabla |
| 3 | Columnas | Pts = 6 ambos; Exactos User1 = 2, User2 = 1; Tendencias según datos |
| 4 | Fila del usuario actual | Resaltada en verde con "(tú)" |
| 5 | Posiciones 1°-3° | Badges dorado/plata/bronce si aplican |

---

#### 3C — Desempate por tendencias (segundo criterio)

Igualar puntos totales **y** exactos; diferir solo tendencias:

```sql
-- User1: 2 tendencias (1+1), 0 exactos → 2 pts total si solo tendencias... 
-- Para empate 4-4 con 1 exacto cada uno, ajustar pronósticos hasta que
-- puntos_totales y exactos coincidan; User con más tendencias va arriba.
```

Consulta de control:

```sql
SELECT posicion, nombre_visible, puntos_totales, exactos, tendencias, joined_at
FROM public.tabla_liderato_quiniela('a0000000-0000-4000-8000-000000000001')
ORDER BY posicion;
```

---

## 3. Instrucciones de simulación (Supabase)

### 3.1 Partido — estados de tiempo

```sql
-- Candado quiniela ABIERTO (>5 min)
UPDATE public.partidos
SET fecha_kickoff = now() + interval '30 minutes',
    estatus = 'programado',
    marcador_local = NULL, marcador_visitante = NULL
WHERE id = 'TU_PARTIDO_UUID';

-- Candado quiniela CERRADO (<5 min)
UPDATE public.partidos
SET fecha_kickoff = now() + interval '3 minutes',
    estatus = 'programado'
WHERE id = 'TU_PARTIDO_UUID';

-- Chat CERRADO (>10 min al pitazo)
UPDATE public.partidos
SET fecha_kickoff = now() + interval '20 minutes'
WHERE id = 'TU_PARTIDO_UUID';

-- Chat ABIERTO (≤10 min al pitazo)
UPDATE public.partidos
SET fecha_kickoff = now() + interval '8 minutes'
WHERE id = 'TU_PARTIDO_UUID';
```

---

### 3.2 Partido — en vivo y finalizado

```sql
-- En vivo + marcador (dispara Realtime en Home/Detalle)
UPDATE public.partidos
SET estatus = 'en_vivo',
    marcador_local = 1,
    marcador_visitante = 0,
    minuto_actual = 42,
    fecha_kickoff = now() - interval '50 minutes'
WHERE id = 'TU_PARTIDO_UUID';

-- Finalizado (dispara recálculo de puntos en pronósticos)
UPDATE public.partidos
SET estatus = 'finalizado',
    marcador_local = 2,
    marcador_visitante = 1,
    minuto_actual = NULL,
    fecha_kickoff = now() - interval '2 hours'
WHERE id = 'TU_PARTIDO_UUID';

-- Forzar recálculo manual si hace falta
SELECT public.recalcular_puntos_partido('TU_PARTIDO_UUID');
```

---

### 3.3 Calendario Home — partido “hoy” CDMX

```sql
-- Kickoff hoy en horario México (aproximado vía UTC; ajustar según necesidad)
UPDATE public.partidos
SET fecha_kickoff = date_trunc('day', now() AT TIME ZONE 'America/Mexico_City')
  + interval '20 hours'
WHERE id = 'TU_PARTIDO_UUID';
```

O usar seed: `supabase/seeds/sample_partidos_hoy.sql`

---

### 3.4 Chat — mensajes de prueba

```sql
INSERT INTO public.mensajes_chat (partido_id, liga_id, usuario_id, tipo, contenido)
VALUES (
  'TU_PARTIDO_UUID',
  'a0000000-0000-4000-8000-000000000001',
  'TU_USER_UUID',
  'usuario',
  'Mensaje de prueba manual'
);
```

---

### 3.5 Limpiar datos de prueba

```sql
-- Solo mensajes de un partido
DELETE FROM public.mensajes_chat WHERE partido_id = 'TU_PARTIDO_UUID';

-- Pronósticos de prueba
DELETE FROM public.pronosticos
WHERE partido_id IN ('PARTIDO_A_UUID', 'PARTIDO_B_UUID');

-- Ejecutar limpieza 24h manual
SELECT public.limpiar_mensajes_chat_antiguos();
```

---

## 4. Matriz rápida de regresión (smoke test)

| # | Flujo | Ruta | OK |
|---|-------|------|-----|
| 1 | Login | `/login` | ☐ |
| 2 | Home carga calendario | `/` | ☐ |
| 3 | Guardar pronóstico (T+30min) | `/quiniela` | ☐ |
| 4 | Detalle + pronóstico card | `/partidos/[id]` | ☐ |
| 5 | Chat enviar + persistir | `/partidos/[id]` → `/` → volver | ☐ |
| 6 | Reportar + moderar | 2 usuarios | ☐ |
| 7 | Leaderboard orden | `/leaderboard` | ☐ |
| 8 | Cargar partidos API | `POST /api/admin/cargar-partidos` | ☐ |
| 9 | Build producción | `npm run build` | ☐ |

---

## 5. Referencia de constantes en código

| Regla | Constante | Archivo |
|-------|-----------|---------|
| Candado quiniela T-5 | `QUINIELA_LOCK_MINUTES_BEFORE = 5` | `src/lib/quiniela/lock.ts` |
| Chat abre T-10 | `CHAT_ABRE_MINUTOS_ANTES = 10` | `src/lib/partidos/chat-window.ts` |
| Liga global UUID | `LIGA_GLOBAL_ID` | `src/lib/constants.ts` |
| Puntos exacto / tendencia | 3 / 1 | `calcular_puntos_pronostico()` en SQL |

---

*Documento generado a partir del estado del repositorio Mundial Compas. Actualizar si cambian rutas, migraciones o reglas de negocio.*
