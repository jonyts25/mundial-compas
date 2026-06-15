# SPORTS CORE — SC-3 MATCH PREVIEW — REPORTE

> Extracción del motor puro de preview y señales a `src/lib/sports-core`.
>
> **Resultado:** ✅ Completado. Cero cambios visuales; fixtures y QA PI-4 pasan.

---

## 1. Archivos creados / modificados

### Creados

| Archivo | Contenido |
|---------|-----------|
| `src/lib/sports-core/predictions/preview/match-preview.ts` | Motor `computeMatchPreviewVerdict` (fuente de verdad SC-3) |
| `src/lib/sports-core/predictions/preview/signals.ts` | Contradicción crowd/table/form + helpers |

### Modificados (shims @deprecated)

| Archivo | Cambio |
|---------|--------|
| `src/lib/prediction-engine/match-preview.ts` | Re-export desde sports-core |
| `src/lib/partidos/pitoniso-signals.ts` | Tipos producto Mundial + re-export señales |
| `src/lib/sports-core/index.ts` | Export preview + signals |
| `src/lib/sports-core/README.md` | Estado SC-3 |

### Sin cambios de imports

| Consumidor | Sigue importando |
|------------|------------------|
| `PitonisoCard.tsx` | `@/lib/partidos/pitoniso-signals`, `@/lib/prediction-engine/match-preview` |
| `pitoniso-queries.ts` | `@/lib/partidos/pitoniso-signals` |
| `pitoniso-message.ts` | `@/lib/prediction-engine/match-preview` |
| `pitoniso.ts` barrel | `./match-preview` (shim) |
| Fixtures / scripts | Rutas legacy |

---

## 2. Rutas deprecated

```typescript
// @deprecated → @/lib/sports-core/predictions/preview/match-preview
import { computeMatchPreviewVerdict } from "@/lib/prediction-engine/match-preview";

// Funciones puras → @/lib/sports-core/predictions/preview/signals
// Tipos producto (PitonisoStaticContext, etc.) → @/lib/partidos/pitoniso-signals
import { analyzePitonisoSignalContradictionWithCrowd } from "@/lib/partidos/pitoniso-signals";
```

Nombres genéricos nuevos en core (conviven con aliases Pitoniso):

| Sports Core | Alias deprecated |
|-------------|------------------|
| `analyzeSignalContradiction` | `analyzePitonisoSignalContradiction` |
| `SignalLeaders` | `PitonisoSignalLeaders` |
| `PreviewPhaseFlags` | `PitonisoPhaseFlags` |

---

## 3. Confirmación cero cambios visuales

| Área | Estado |
|------|--------|
| PitonisoCard UI/copy | ✅ Sin cambios |
| TuPronosticoCard / WhatsNew | ✅ No tocados |
| Analytics | ✅ No tocados |
| Supabase / queries | ✅ No tocados |
| Motor output (fixtures) | ✅ Idéntico — verify-pitoniso-pi1 pasa |

**Nota de arquitectura:** `pitoniso-signals.ts` conserva tipos acoplados a Mundial (`FaseMundial`, `TeamCompetitionForm`) en capa producto; la lógica pura vive en sports-core.

**Dependencia temporal:** preview importa `PickAggregates` desde `@/lib/insights/pick-aggregates` hasta **SC-4**.

---

## 4. Validación scripts

| Comando | Resultado |
|---------|-----------|
| `npx tsc --noEmit` | ✅ |
| `npx -y tsx scripts/verify-pitoniso-pi1.ts` | ✅ All fixture assertions passed |
| `npx -y tsx scripts/verify-pitoniso-pi4-qa.ts` | ✅ All PI-4 QA assertions passed |
| ESLint archivos SC-3 | ✅ |

---

## 5. Decisiones de naming (SC-3)

- **local / visitante** mantenidos en `MatchPreviewInput` — compatibilidad total con PI-1…PI-3.
- **home / away** reservados en `sports-core/predictions/types.ts` (SC-2) para SC-6.
- Tipos producto **Pitoniso*** permanecen en re-exports; tipos genéricos **Signal*** añadidos en core.
- TODO(SC-6) en archivos movidos para normalización final.

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Divergencia shim vs core | Shims son `export *` únicamente; una sola implementación |
| sports-core importa pick-aggregates | Documentado; SC-4 mueve agregados |
| Dos nombres (Signal vs Pitoniso) | Aliases deprecated; adapters SC-6 unifican |
| pitoniso-signals sigue en partidos/ | Tipos producto hasta adapter SC-6 |

---

## 7. Próximos pasos — SC-4

1. Mover `pick-aggregates.ts` → `sports-core/predictions/aggregates.ts`
2. Mover `pick-value.ts` → `sports-core/predictions/pick-value.ts`
3. Actualizar import en `match-preview.ts` del core
4. Re-exports en `src/lib/insights/pick-aggregates.ts`
5. Verificar pick-value panel + Pitoniso sin regresión

**Prompt sugerido:** *“Implementa SC-4 según SPORTS_CORE_MASTERPLAN.md y SPORTS_CORE_SC3_REPORT.md”*

---

*SC-3 · Match Preview sin marca · Jun 2026*
