# MATCH-SUMMARY-DETERMINISTIC-EVENTS-1 — Reporte

## Objetivo

Evitar que la IA invente detalles de eventos del partido. Los incidentes se narran por código (`event_facts_locked` → `event_paragraphs`); Ollama solo redacta contexto y cierre.

## Cambios implementados

### Fase 1 — `event_facts_locked`

- Nuevo módulo `src/lib/ai/match-summary/match-summary-event-facts.ts`.
- `enrichMatchSummaryInput` ahora genera `event_facts_locked[]` con `{ id, minute_label, team_name, player_name, type, sentence }`.
- Reglas:
  - `player_name` copiado exacto de la API.
  - Goles: "gol" (nunca "gol normal"); penal → "gol de penal"; autogol → "autogol".
  - Tarjeta roja: expulsión neutra salvo `detail` con Second Yellow explícito.
  - `penal_fallado`, `var`, `gol_anulado`: oraciones determinísticas.

### Fase 2 — Prompt

- Ollama responde `match-summary-llm-v1` (sin `facts[]`, sin `body_paragraphs`, sin eventos).
- Bloque `event_facts_locked` en el prompt con frases prohibidas explícitas.

### Fase 3 — Output

- `MatchSummaryLlmOutput`: headline, lede, context_paragraphs, closing_paragraph, table/quiniela, standout.
- `assembleMatchSummaryOutput()` une LLM + `event_paragraphs` + `verified_facts` en `facts[]`.
- `body_paragraphs` = context + events + closing (compatibilidad UI).

### Fase 4 — Validator

- Nuevo `match-summary-fact-validator.ts` → `MATCH_SUMMARY_FACT_MISMATCH:<rule>`.
- Rechaza frases prohibidas y nombres expandidos en texto generado por IA.

### Fase 5 — Tests

- Fixture `fixtures/mexico-south-africa-deterministic.fixture.ts` (Quinones 9', Sithole roja 49', Jimenez 67', Zwane roja 84', Montes 90+2').
- `match-summary-deterministic-events.test.ts` (7 casos).

## Archivos tocados

| Archivo | Acción |
|---------|--------|
| `match-summary-event-facts.ts` | Nuevo |
| `match-summary-output-utils.ts` | Nuevo |
| `match-summary-fact-validator.ts` | Nuevo |
| `match-summary-types.ts` | `EventFactLocked`, `MatchSummaryLlmOutput`, campos de output |
| `match-summary-verified-facts.ts` | Wire `event_facts_locked` |
| `match-summary-prompt.ts` | Prompt LLM-only + validadores |
| `route.ts` | Ensamblado + fact validator |
| `PartidoMatchSummaryPanel.tsx` | `getSummaryDisplayParagraphs()` |
| `test-match-summary-lab.ts` | Flujo LLM + assemble |
| `fixtures/mexico-south-africa-deterministic.fixture.ts` | Nuevo |
| `match-summary-deterministic-events.test.ts` | Nuevo |

## No tocado (según spec)

- Scoring / Pitoniso / migrations
- UI pública nueva (solo render existente con párrafos ensamblados)

## Validación

| Comando | Resultado |
|---------|-----------|
| `npm run test:core` | ✅ 90/90 |
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |
| `npm run test:match-summary` | ✅ (Ollama local, partido finalizado de DB) |

## Ejemplo `event_facts_locked` (México vs Sudáfrica)

```json
[
  {
    "minute_label": "9'",
    "player_name": "J. Quinones",
    "sentence": "México abrió el marcador al 9' con gol de J. Quinones."
  },
  {
    "minute_label": "49'",
    "player_name": "Siphephelo Sithole",
    "sentence": "Siphephelo Sithole fue expulsado por Sudáfrica al 49'."
  }
]
```

## Commit

No realizado automáticamente (según instrucción).
