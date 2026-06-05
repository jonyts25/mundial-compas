# Esquema de base de datos — Mundial Compas (Supabase Postgres)

Fuente: `supabase/migrations/*.sql` (17 migraciones, orden por timestamp).

Liga global fija: `a0000000-0000-4000-8000-000000000001` (`mundial-compas`).

---

## Tipos ENUM

### `estatus_partido`
`programado` | `en_vivo` | `medio_tiempo` | `finalizado` | `suspendido` | `aplazado` | `cancelado`

### `canal_transmision`
`azteca_7` | `vix` | `azteca_7_y_vix` | `sin_asignar`

### `fase_mundial`
`grupos` | `dieciseisavos` | `octavos` | `cuartos` | `semifinal` | `tercer_lugar` | `final`

### `rol_liga`
`owner` | `admin` | `miembro`

### `tipo_dato_mamalón`
`trivia` | `hito` | `curiosidad` | `record` | `meme_historico`

### `tipo_mensaje_chat`
`usuario` | `sistema` | `dato_mamalón` | `evento_partido`

### `tipo_notificacion` (evoluciona por migraciones)
Valores base + añadidos:
- `dato_mamalón`, `inicio_partido`, `gol`, `fin_partido`, `recordatorio_pronostico`, `liga`, `quiniela_honor`
- `tarjeta_roja`, `medio_tiempo`, `inicio_segundo_tiempo`, `alineaciones`
- `inicio_tiempo_extra`, `inicio_penales`, `penal_fallado`
- `gol_anulado`, `fin_tiempo_reglamentario`

---

## Tablas

### `usuarios`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | FK `auth.users` |
| username | CITEXT UNIQUE | opcional |
| nombre_visible | TEXT | |
| avatar_url | TEXT | |
| quiniela_paga | BOOLEAN | badge honor; requiere términos |
| quiniela_paga_at | TIMESTAMPTZ | |
| terminos_honor_aceptados_at | TIMESTAMPTZ | |
| terminos_honor_version | TEXT | |
| equipos_favoritos | TEXT[] | max 3 |
| push_habilitado | BOOLEAN | default true |
| metadata | JSONB | tablón confirmación, etc. |

### `ligas_privadas`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| slug | CITEXT UNIQUE | |
| nombre, descripcion | TEXT | |
| codigo_invitacion | TEXT UNIQUE | |
| creador_id | UUID FK usuarios | null si `es_sistema` |
| es_publica, es_sistema, activa | BOOLEAN | |
| configuracion | JSONB | |

### `liga_miembros`
PK `(liga_id, usuario_id)` — rol `rol_liga`

### `partidos`
| Columna | Tipo | Notas |
|---------|------|-------|
| api_football_fixture_id | INTEGER UNIQUE | ID apifootball |
| fase | fase_mundial | |
| grupo | CHAR(1) | |
| jornada | SMALLINT | |
| equipo_*_codigo/nombre | TEXT | |
| sede | TEXT | |
| fecha_kickoff | TIMESTAMPTZ | zona CDMX en carga |
| estatus | estatus_partido | |
| marcador_local/visitante | SMALLINT | |
| canal_transmision | canal_transmision | |
| minuto_actual | SMALLINT | |
| metadata | JSONB | `reloj`, penales, pilot, goles_anunciados, apifootball_* |
| puntos_calculados | BOOLEAN | |

### `pronosticos`
UNIQUE `(liga_id, usuario_id, partido_id)` — goles 0–20, puntos 0–3, `locked_at`

**Trigger:** no insert/update después de `fecha_kickoff` (T-0 en BD; UI usa T-5).

### `datos_mamalones`
Trivia/hitos para VAR y medio tiempo — `activo`, `prioridad`, `contexto[]`, `tags[]`

### `mensajes_chat`
| Columna | Notas |
|---------|-------|
| partido_id | UUID nullable (chat liga general) |
| liga_id | UUID |
| usuario_id | null para sistema/VAR |
| tipo | ver enum |
| dato_mamalón_id | opcional |
| metadata | `autor_display`, `sala: liga_general`, etc. |

**Constraint:** partido_id NOT NULL **o** `metadata.sala = 'liga_general'`

### `webhook_eventos`
Idempotencia: UNIQUE `(proveedor, evento_externo_id)` — default proveedor `apifootball`

### `notificaciones`
Cola in-app + disparo Web Push — `enviada`, `tipo`, `partido_id`, `liga_id`

### `push_subscriptions`
Web Push: `endpoint`, `p256dh`, `auth` por usuario

### `push_partidos_silenciados`
PK `(usuario_id, partido_id)` — mute por partido

### `liquidacion_pagos`
Tablón honor: `deudor_id`, `ganador_id`, `estado` (`pendiente` | `deposito_reportado` | `confirmado`)

---

## Funciones y triggers (dominio)

| Nombre | Propósito |
|--------|-----------|
| `calcular_puntos_pronostico` | 3 exacto, 1 resultado, 0 |
| `recalcular_puntos_partido` | Al finalizar partido |
| `trg_partido_finalizado_puntos` | AFTER UPDATE partidos |
| `trg_bloquear_pronostico_kickoff` | Bloqueo post kickoff |
| `handle_new_user` | Crea perfil + alta liga global |
| `evaluar_ganador_inalcanzable` | Competencia honor (RPC) |
| Limpieza chat 24h | migración `20260518160000` |

---

## RLS (resumen)

| Tabla | Política general |
|-------|------------------|
| usuarios | SELECT todos auth; UPDATE solo propio |
| partidos | SELECT todos auth |
| ligas_privadas | SELECT si pública, sistema o miembro |
| liga_miembros | SELECT si mismo usuario o co-miembro (fix recursión en migración) |
| pronosticos | SELECT/INSERT/UPDATE si miembro de la liga |
| datos_mamalones | SELECT si `activo` |
| mensajes_chat | SELECT/INSERT si miembro; INSERT usuario solo propio |
| notificaciones | ALL solo propias |
| push_subscriptions | CRUD propio |
| liquidacion_pagos | SELECT miembros; UPDATE deudor |

**Service role** (webhooks, admin): bypass RLS vía `createAdminClient()`.

---

## Realtime

Migración `20260518140000`: publicación para `mensajes_chat` y `partidos` (habilitar en dashboard si falta).

---

## Seeds

| Archivo | Contenido |
|---------|-----------|
| `seed_datos_mamalones.sql` | INSERT trivia base |
| `datos_mamalones.json` + expansion + mexico | ~80+ datos mamalones |
| `sample_partidos_hoy.sql` | Partidos demo |

Scripts: `scripts/seed-datos-mamalones-expansion.mjs`, `recargar-mundial.mjs`, `cargar-pilot-local.mjs`

---

## Metadata JSON importante (`partidos.metadata`)

```json
{
  "reloj": { "period": "2H", "anchorMinute": 67, "anchoredAt": "...", "ticking": true },
  "apifootball_status_raw": "67",
  "marcador_penales_local": 2,
  "marcador_penales_visitante": 1,
  "penales_kicks_vistos": ["pen-goal-1-..."],
  "goles_anunciados": [{ "key": "gf-h-...", "player": "...", "isHome": true }],
  "competencia": "pilot",
  "competencia_label": "UCL pilot"
}
```
