# AI-SUMMARY-QUEUE-DESIGN — Cola de resúmenes IA

**Estado:** diseño (no implementado)  
**Relacionado:** AI-SUMMARY-AVAILABILITY-1, MATCH-SUMMARY-LAB-1  
**Fecha:** 2026-05-18

---

## Problema

Hoy `/api/dev/ai/match-summary` llama a Ollama de forma síncrona. Si la PC local/ngrok está apagada, el usuario ve un mensaje amigable pero **no hay persistencia ni reintento**. Para producción futura necesitamos generar resúmenes cuando Ollama vuelva a estar online.

---

## Tabla propuesta: `ai_summary_jobs`

Sin migration en esta fase — diseño para cuando se implemente.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` PK | |
| `partido_id` | `uuid` FK → `partidos` | |
| `persona_id` | `text` | ej. `cronista_mx_1` |
| `requested_by` | `uuid` FK → `auth.users` | quién pidió el resumen |
| `status` | `text` | `pending` \| `processing` \| `completed` \| `failed` |
| `attempts` | `int` default 0 | |
| `max_attempts` | `int` default 5 | |
| `next_retry_at` | `timestamptz` | backoff exponencial |
| `input_snapshot` | `jsonb` | `MatchSummaryInput` congelado al encolar |
| `output` | `jsonb` null | `MatchSummaryOutput` al completar |
| `last_error` | `text` null | `OLLAMA_UNAVAILABLE`, etc. |
| `completed_at` | `timestamptz` null | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### Índices

- **Único:** `(partido_id, persona_id)` WHERE `status IN ('pending','processing')` — dedup activo.
- **Worker:** `(status, next_retry_at)` WHERE `status = 'pending'`.

### RLS

- Lectura: usuario que pidió el job o admin lab.
- Escritura: solo service role / worker.

---

## Estados

```
pending → processing → completed
         ↘ failed (max_attempts) 
         ↘ pending (retry con next_retry_at)
```

| Estado | Significado |
|--------|-------------|
| `pending` | En cola, esperando worker |
| `processing` | Worker tomó el job (lease corto) |
| `completed` | `output` guardado |
| `failed` | Agotó reintentos; usuario puede re-encolar manual |

---

## Flujo usuario

1. Usuario pulsa «Generar resumen IA» en partido finalizado.
2. API intenta Ollama inmediato (fast path).
3. Si `OLLAMA_UNAVAILABLE` / `OLLAMA_TIMEOUT`:
   - Upsert job `pending` (dedup `partido_id + persona_id`).
   - Responde `{ ok: false, queued: true, job_id }` + `input` para UI.
4. UI muestra mensaje de indisponibilidad + datos del partido (ya implementado en AVAILABILITY-1).
5. Cuando worker completa → push opcional / badge «Resumen listo» (futuro).

---

## Worker

### Opción A — Local (PC con Ollama)

Script `scripts/ai-summary-worker.mjs`:

- Poll Supabase cada 30–60s (solo si Ollama health OK).
- `SELECT … FOR UPDATE SKIP LOCKED` o claim vía RPC.
- Llama misma lógica que `match-summary` route (`ollamaJson` + prompt).
- Actualiza job → `completed` o incrementa `attempts`.

Ventaja: Ollama sigue en tu máquina; Railway no necesita GPU.

### Opción B — Railway cron

Mismo script en servicio `ai-summary-worker` si Ollama migra a cloud.

### Retry

| Intento | Espera antes de retry |
|--------:|----------------------|
| 1 | 1 min |
| 2 | 5 min |
| 3 | 15 min |
| 4 | 1 h |
| 5 | 4 h → `failed` |

`last_error` preservado para debugging.

---

## Dedup

Clave lógica: **`partido_id` + `persona_id`**.

- Nuevo request con job `pending`/`processing` existente → devolver job existente (no duplicar).
- Request tras `completed` → nuevo job solo si usuario pide «Regenerar» (`force: true`).
- Request tras `failed` → reset a `pending` con `attempts = 0`.

---

## Cuando la PC vuelve online

1. ngrok tunnel activo + `OLLAMA_BASE_URL` en Railway apunta al tunnel.
2. Worker local detecta health OK.
3. Procesa cola `pending` ordenada por `created_at`.
4. Jobs completados notifican (fase 2):
   - Push web: `tipo: ai_summary_ready`
   - O email in-app / banner en detalle partido.

Sin worker local: jobs quedan `pending` hasta que alguien ejecute el worker o Ollama esté en cloud.

---

## API cambios futuros (borrador)

```
POST /api/dev/ai/match-summary
  ?queue_on_failure=true   (default true en prod lab)

GET  /api/dev/ai/match-summary/jobs/:id
GET  /api/dev/ai/match-summary/jobs?partido_id=
```

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| ngrok URL cambia | Variable `OLLAMA_BASE_URL` + alerta health cron |
| Jobs atascados en `processing` | Lease TTL 5 min → reclaim a `pending` |
| Input desactualizado si marcador corrige | Snapshot al encolar; re-build opcional en retry |
| Costo API-Sports en rebuild | No re-fetch en worker; usar `input_snapshot` |
| Spam de cola | Dedup + rate limit por usuario (ej. 10 jobs/día) |
| PII en `input_snapshot` | Solo datos públicos del partido; sin emails |
| Worker local apagado | Jobs acumulan; UX debe decir «se generará cuando IA esté disponible» |
| Modelo lento (90s+) | `maxDuration` Railway; worker async sin límite HTTP |

---

## Fuera de alcance (esta fase)

- Migration / tabla real
- Worker / cron
- Push `ai_summary_ready`
- UI pública masiva (solo lab + panel autorizado)

---

## Referencia implementada (AVAILABILITY-1)

- Mensaje: *«La IA no está disponible en este momento. Puedes volver a intentar más tarde.»*
- Componente `MatchSummaryInputFacts` — marcador, stats, cronología, quiniela agregada.
- Analytics: `ai_summary_unavailable` con `reason`.
