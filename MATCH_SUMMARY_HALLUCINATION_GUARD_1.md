# MATCH-SUMMARY-HALLUCINATION-GUARD-1

**Fecha:** 2026-05-18  
**Alcance:** Resúmenes IA post-partido — sin cola, sin UI pública masiva, sin migrations.

---

## Problema

El modelo infería narrativas no soportadas por datos, por ejemplo en **México vs Sudáfrica** (2-0):

- «segunda amarilla» / «roja directa» ante un evento VAR `Card upgrade`
- «confirmando el marcador» como floritura psicológica
- «cambió el rumbo», «dominó psicológicamente», «penal polémico» sin evidencia

---

## Solución

### 1. `event_text` generado por código

Cada ítem de `timeline` recibe `event_text` factual en `buildMatchSummaryInput` → `enrichMatchSummaryInput`.

Ejemplo VAR Card upgrade:

> Revisión VAR: Card upgrade — Themba Zwane (RSA) al 82'.

No dice expulsión ni segunda amarilla.

### 2. `verified_facts[]` y `narrative_evidence`

| Campo | Origen |
|-------|--------|
| `verified_facts` | Marcador, stats numéricas, cada `event_text` |
| `narrative_evidence` | Flags booleanos: qué inferencias están permitidas |

Flags solo `true` con evidencia explícita en `detail` (ej. `Second Yellow` → `allows_second_yellow_red`).

### 3. Prompt reforzado

- Bloque `EVENTOS` con `event_text`
- Bloque `HECHOS VERIFICADOS`
- Lista **PROHIBIDO INFERIR**
- `facts[]` debe derivar de `verified_facts`

### 4. Guard post-IA (`match-summary-hallucination-guard.ts`)

Escanea headline, lede, body, facts, etc. contra frases prohibidas si el flag correspondiente es `false`.

Respuesta API si falla: **422** `HALLUCINATION_GUARD:<rule_id>` + `hallucinations[]` + `input` para depuración.

---

## Frases prohibidas (sin evidencia)

| Regla | Ejemplos bloqueados |
|-------|---------------------|
| `second_yellow` | segunda amarilla, doble amonestación |
| `direct_red` | roja directa |
| `controversial_penalty` | penal polémico |
| `momentum_shift` | cambió el rumbo, volteó el partido |
| `score_confirmation` | confirmó el marcador, confirmando el marcador |
| `psychological` | dominó psicológicamente, controló emocionalmente |

La IA **puede conectar** eventos; **no reinterpretarlos**.

---

## Test México vs Sudáfrica

Fixture: `fixtures/mexico-south-africa.fixture.ts` (partido `e04a2b98-…`, fixture `1489369`).

Valida:

- `narrative_evidence` no permite segunda amarilla / roja directa / confirmación de marcador
- `event_text` del VAR no menciona expulsión
- Guard **rechaza** salidas con «segunda amarilla», «roja directa», «confirmando el marcador»
- Guard **acepta** salida que solo parafrasea goles + VAR Card upgrade

---

## Archivos

| Archivo | Rol |
|---------|-----|
| `match-summary-event-text.ts` | Genera `event_text` |
| `match-summary-verified-facts.ts` | `verified_facts`, `narrative_evidence`, enrich |
| `match-summary-hallucination-guard.ts` | Escaneo post-IA |
| `fixtures/mexico-south-africa.fixture.ts` | Datos de prueba |
| `match-summary-hallucination-guard.test.ts` | Tests |
| `match-summary-prompt.ts` | Instrucciones |
| `match-summary/route.ts` | Aplica guard |

---

## Riesgos / pendiente

- Parafraseo sutil que evade regex (sinónimos no listados).
- `allows_direct_red` requiere `detail` con “red” sin “second yellow” — API a veces solo dice `Red Card`.
- Reintentos automáticos de IA ante `HALLUCINATION_GUARD` (futuro).
- Ampliar fixture con nombres reales de goleadores cuando se confirme API.

---

## Validación

```bash
npm run test:core
npm run typecheck
npm run build
```
