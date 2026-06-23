# Sports Narrator Personas — Report

**Archivo:** `src/lib/ai/sports-narrator-personas.ts`  
**Estado:** Listo para lab IA. Sin UI pública.

---

## Personas ficticias

| id | displayName | Perfil |
|----|-------------|--------|
| `cronista_clasico` | El Cronista de Archivo | Sobrio, cronológico, datos primero |
| `relator_barrio` | La Voz del Callejón | Cercano, mexicano neutro, cancha/barrio |
| `analista_frio` | El Tablero | Telegráfico, números, sin adjetivos vacíos |
| `pluma_dramatica` | La Pluma del Final | Un giro dramático moderado, cierre con consecuencia |
| `voz_tribuna` | La Tribuna Compas | Hincha, comunidad, quiniela agregada |

Default: `cronista_clasico`.

---

## API del módulo

```typescript
getSportsNarratorPersona(id)
listSportsNarratorPersonas()
buildPersonaPromptBlock(id) // bloque para Ollama
```

---

## Separación de `narracion/comentaristas.ts`

| | `comentaristas.ts` | `sports-narrator-personas.ts` |
|--|-------------------|-------------------------------|
| Uso | Chat live, push, plantillas fijas | Resúmenes IA JSON |
| Estilo | Parodia/homenaje regional | Arquetipos 100% ficticios |
| Output | String corto | Prompt + validación JSON |
| Prod hoy | Sí | No (lab) |

**No reemplazar** comentaristas en sync live — coexisten.

---

## Cumplimiento de restricciones

- ✅ Sin nombres de comentaristas reales
- ✅ Sin frases icónicas copiadas
- ✅ `forbiddenRules` explícitas por persona
- ✅ `toneRules` accionables en prompt
- ✅ No toca Pitoniso ni scoring

---

## Uso en lab (ejemplo)

```typescript
import { buildPersonaPromptBlock } from "@/lib/ai/sports-narrator-personas";

const system = [
  buildPersonaPromptBlock("analista_frio"),
  "Responde SOLO JSON según match_summary_output.",
  "Input:",
  JSON.stringify(input),
].join("\n\n");
```

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| LLM ignora forbiddenRules | Validación post-hoc + rechazo |
| Confusión con comentaristas live | Nombres ficticios distintos |
| Tono demasiado homogéneo | Rotar persona por tipo de resumen |
