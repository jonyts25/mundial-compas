# AI_SPORTS_CONTENT_PLAN — Casos de uso Ollama (solo redacción)

**Principio:** La IA **nunca** calcula señales, scoring ni ganadores. Solo redacta JSON/copy a partir de un **payload calculado por código**.

**Guardrails compartidos:** `src/lib/ai/ai-sports-prompt-guardrails.ts` (`AI_SPORTS_PROMPT_GUARDRAILS`).

---

## Reglas globales (todos los prompts)

1. Usar **solo** campos del input JSON.
2. Si falta un dato → `"no tengo esa señal"` (o omitir sección).
3. **Prohibido:** estadio/sede sin `match.venue`; ciudad sin `match.city`; jugadores sin `players[]`; historial sin `history`/`h2h`.
4. **Prohibido:** porcentajes no presentes en input; “apuesta segura”; garantizar resultado.
5. **Obligatorio:** `disclaimer` corto de entretenimiento.
6. Salida: **JSON válido** (schema por caso).
7. Modelo sugerido: `OLLAMA_MODEL_SPANISH` (gemma3:4b) para copy ES; `OLLAMA_MODEL_SMART` para resúmenes largos.

---

## 1. Explicación Pitoniso (implementado — lab)

**Estado:** `POST /api/dev/ai/pitoniso-preview`  
**Input:** `PitonisoLabInput` — match + signals + optional venue/city  
**Output:**

```json
{
  "headline": "string",
  "summary": "string",
  "risk_label": "bajo|medio|alto",
  "bullets": ["string"],
  "disclaimer": "string"
}
```

**Prompt:** `buildPitonisoPreviewPrompt()` — máx. 2 bullets.  
**QA:** `detectSportsContentHallucinations()` + smoke `test:ollama`.

---

## 2. Resumen pre-partido

**Input sugerido (`PreMatchSummaryInput`):**

```json
{
  "match": { "home", "away", "kickoff", "venue?", "city?", "fase", "grupo?", "jornada?" },
  "standings": { "home_pos?", "away_pos?", "home_pts?", "away_pts?" },
  "form": { "home_norm?", "away_norm?" },
  "ranking": { "home_rank?", "away_rank?", "gap?" },
  "crowd": { "home_pct?", "draw_pct?", "away_pct?", "sample?" },
  "injuries": [{ "team", "player", "reason" }],
  "lineups_confirmed": false,
  "stakes": "string | no tengo esa señal",
  "pitoniso_verdict": { "favorite", "confidence", "draw_signal?" }
}
```

**Output:**

```json
{
  "headline": "string",
  "hook": "string",
  "keys_to_watch": ["string"],
  "tone": "neutral",
  "disclaimer": "string"
}
```

**Restricciones extra:** No nombrar jugadores si `lineups_confirmed=false` o `injuries` vacío.

---

## 3. Resumen post-partido

**Input (`PostMatchSummaryInput`):**

```json
{
  "match": { "home", "away", "venue?", "final_score", "status" },
  "timeline": [{ "minute", "type", "team", "player?", "detail?" }],
  "statistics": { "possession_home?", "shots_home?", "shots_away?" },
  "standings_impact": { "home_pos_after?", "away_pos_after?", "text?" },
  "pitoniso_pre": { "favorite?", "was_correct?" }
}
```

**Output:**

```json
{
  "headline": "string",
  "summary": "string",
  "turning_point": "string | no tengo esa señal",
  "standout": "string | no tengo esa señal",
  "disclaimer": "string"
}
```

**Fuente datos:** `metadata.eventos_clave` + futuro `metadata.statistics`.

---

## 4. Resumen de jornada

**Input (`RoundSummaryInput`):**

```json
{
  "competition": "Mundial 2026",
  "grupo": "A",
  "jornada": 2,
  "matches": [
    { "home", "away", "score", "highlights": ["string"] }
  ],
  "standings_after": [{ "team", "pos", "pts" }]
}
```

**Output:**

```json
{
  "headline": "string",
  "summary": "string",
  "surprise": "string | no tengo esa señal",
  "disclaimer": "string"
}
```

**API calls:** 0 extra si partidos ya en DB.

---

## 5. Resumen de grupo

**Input (`GroupSummaryInput`):**

```json
{
  "grupo": "C",
  "standings": [{ "team", "pos", "pts", "gd" }],
  "matches_played": number,
  "matches_remaining": number,
  "qualification_scenarios": ["string"],
  "key_upcoming": [{ "home", "away", "kickoff" }]
}
```

**Output:** headline, narrative, teams_in_form[], teams_in_trouble[], disclaimer.

**Fuente:** `calculateGroupStandingsFromPartidos` + escenarios knockout existentes.

---

## 6. Jugadores a seguir

**Input (`PlayersToWatchInput`):**

```json
{
  "match": { "home", "away" },
  "players": [
    { "name", "team", "reason", "stat_line?" }
  ],
  "injuries_returning": []
}
```

**Output:**

```json
{
  "headline": "string",
  "picks": [{ "name", "team", "one_liner" }],
  "disclaimer": "string"
}
```

**Regla:** `picks` ⊆ `players` del input (mismo nombre). Máx. 3.

---

## 7. Copy pick popular / diferencial / riesgo

**Input (`PickCopyInput`):**

```json
{
  "match": { "home", "away" },
  "pick_type": "popular|diferencial|riesgo",
  "crowd": { "outcome", "pct?" },
  "contrarian_signal": "string | no tengo esa señal",
  "pitoniso_alignment": "aligned|contradicts|mixed"
}
```

**Output:** headline, body (2 frases), disclaimer. Sin “gana” ni “seguro”.

---

## 8. Crónica corta para compartir

**Input (`ShareChronicleInput`):**

```json
{
  "match": { "home", "away", "venue?", "score" },
  "bullets_facts": ["string"],
  "max_chars": 280
}
```

**Output:**

```json
{
  "chronicle": "string",
  "hashtags": ["string"],
  "disclaimer": "string"
}
```

**Regla:** Cada frase de `chronicle` debe poder trazarse a un `bullets_facts[]`.

---

## Matriz caso × fase

| Caso | Fase A (lab) | Fase B (metadata+) | Fase C (público) |
|------|--------------|-------------------|------------------|
| Pitoniso explain | ✅ | Enriquecer input | No |
| Pre-partido | Diseño | Lab endpoint | No |
| Post-partido | Diseño | Lab + statistics | No |
| Jornada/grupo | Diseño | Lab agregador | No |
| Jugadores | Diseño | injuries API | No |
| Pick copy | Diseño | Lab | No |
| Crónica share | Diseño | Lab | Evaluar |

---

## Endpoint lab futuros (propuesta)

| Método | Ruta | Caso |
|--------|------|------|
| POST | `/api/dev/ai/pitoniso-preview` | ✅ existente |
| POST | `/api/dev/ai/pre-match-summary` | Caso 2 |
| POST | `/api/dev/ai/post-match-summary` | Caso 3 |
| POST | `/api/dev/ai/round-summary` | Caso 4 |
| POST | `/api/dev/ai/group-summary` | Caso 5 |

Todos protegidos por `canUseAiLab` → 404.

---

## Lección: alucinación “El Azteca”

**Causa:** Input sin `venue`; modelo completó con conocimiento previo.  
**Fix:** `match.venue` explícito o `"Venue: no tengo esa señal"` en prompt + validador `detectSportsContentHallucinations` + smoke test.

Cuando `partidos.sede` exista en DB, incluir en lab input como `match.venue` (Fase A).
