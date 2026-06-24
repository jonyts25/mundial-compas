# LIVE_SCENARIOS_GROUP_CONTEXT_1 — Reporte

**Objetivo:** Card "Escenario en vivo" contextual al grupo/tab activo en `/posiciones`.

**Estado:** ✅ Completado

---

## Cambio principal

La card ya no lista todos los grupos A–D en bloque. Muestra el escenario del **grupo seleccionado** y mantiene una sección **global compacta** (mejores terceros, Anexo C, Ronda de 32).

## Comportamiento

| Acción | Resultado |
|--------|-----------|
| Tab Grupo A | Card: "Escenario en vivo — Grupo A" con MEX/KOR/RSA + rivales R32 |
| Tab Grupo K | Card cambia a Portugal/Colombia/RD Congo/Uzbekistán |
| Tab Mejores 3.º | Card global (sin líneas de grupo); tabs de grupo siguen en chips |
| Chips en card | Sincronizados con tabs de grupo A–L |

## Motor (sin duplicar FIFA)

Nuevas funciones en `fifa-live-scenarios.ts`:

- `buildGroupContextScenarioView` — líneas por grupo desde snapshot
- `buildAllGroupContextViews` — precomputa todos los grupos activos
- `buildGlobalScenarioSummary` — mejores terceros + Anexo C + R32
- `getGroupContextForLetter` — selector para UI
- `filterChangesForGroup` — diff contextual

## Archivos

| Archivo | Cambio |
|---------|--------|
| `fifa-live-scenarios.ts` | Modelo contextual + global |
| `LiveScenarioCard.tsx` | UI por grupo + sección global |
| `PosicionesContent.tsx` | Estado compartido tab ↔ card |
| `GroupTabs.tsx` | Tabs controlados (active/onActiveChange) |
| `page.tsx` | Usa PosicionesContent |
| `world-cup-fifa-scenarios.fixture.ts` | Fixture Grupo K |
| `fifa-live-scenarios.test.ts` | +4 tests contextuales |

## Tests

- Grupo A: México, Corea, Sudáfrica (Chequia 4.º en tabla)
- Grupo K: Portugal, Colombia, RD Congo
- Cambio A → K altera líneas renderizadas
- Mejores terceros global intacto

## Validación

```
npm run test:core   → 102/102 ✅
npm run typecheck   → ✅
npm run build       → ✅
```
