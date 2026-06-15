# MATCH-MULTI-QUINIELA-1 Report

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/app/(app)/partidos/[id]/page.tsx` | Carga paralela `fetchPartidoQuinielaContexts`; pasa `quinielaContexts` al bloque pronóstico/Pitoniso. Resto sin cambios (chat, info, reminder, agregados post-partido). |
| `src/components/partidos/PartidoPronosticoPitonisoBlock.tsx` | Estado `selectedLigaId` y `contexts` local; orden Pitoniso → chips → “Guardando en” → formulario; analytics selector; actualiza pronóstico por liga al guardar. |
| `src/components/partidos/TuPronosticoCard.tsx` | Prop opcional `ligaScope` para analytics; `pronostico_saved` / `prediction_updated` con `source: "match_detail"` (ya existía). Remount vía `key={selectedLigaId}` desde el bloque padre. |
| `src/components/partidos/PitonisoCard.tsx` | Prop `compact`: mensaje + confianza arriba; inclinación/popular en expand “Ver señales ▾”. Una instancia; `key={selectedLigaId}` fuerza refresh al cambiar liga. |
| `src/lib/analytics/events.ts` | Añadidos `match_liga_selector_shown`, `match_liga_selected`. |

## Archivos creados

| Archivo | Rol |
|---------|-----|
| `src/lib/queries/partido-quiniela-contexts.ts` | `fetchPartidoQuinielaContexts(partidoId, userId)` — global + grupos privados activos, pronóstico del usuario por liga. |
| `MATCH_MULTI_QUINIELA_1_REPORT.md` | Este reporte. |

## Decisiones tomadas

1. **`key={selectedLigaId}`** en `PitonisoCard` y `TuPronosticoCard` para reset limpio al cambiar chip sin `setState` síncrono en `useEffect` (eslint `react-hooks/set-state-in-effect`).
2. **Estado `contexts` en cliente** actualizado tras guardar, sin refetch server — suficiente para reflejar marcador por liga en la misma sesión.
3. **Chip “Global”** en multi-liga en lugar del nombre largo — legibilidad en móvil; el nombre completo aparece en “Guardando en: …”.
4. **`createServerDataClient`** en el helper (mismo patrón que `grupos-queries` / `home-dashboard-queries`) para leer membresías y pronósticos del usuario sin depender de RLS del cliente en server component.

## Desviaciones del prompt

| Ítem | Nota |
|------|------|
| Label solo-global | Se muestra siempre “Guardando en: {nombre}” (incluye single-global). El prompt pedía mini label en caso A — cumple el espíritu; no hay chips. |
| `fetchPartidoDetallePageData` | No se modificó internamente; la llamada a contexts es paralela en `page.tsx` como indicaba el paso 2. |
| Pitoniso `compact` | No estaba explícito en archivos permitidos como obligatorio, pero era requisito UX del audit; implementado en `PitonisoCard.tsx` (archivo permitido). |

## QA checklist

1. [ ] Usuario solo global: pantalla casi idéntica a antes, guarda en global — **Pendiente manual** (lógica: sin chips, label + form global).
2. [ ] Usuario global + 2 grupos: chips visibles, cambiar chip carga pronóstico correcto — **Pendiente manual** (`key` + contexts server).
3. [ ] Guardar en grupo: guarda con `liga_id` del grupo, no modifica global — **Pendiente manual** (`savePronostico` + update local solo esa liga).
4. [ ] Guardar en global: no modifica ningún grupo — **Pendiente manual**.
5. [ ] Pitoniso: cambia agregados al cambiar liga, no duplicado — **Pendiente manual** (una instancia + `key` + `ligaId`).
6. [ ] Locked: inputs readonly — **Pendiente manual** (lock por partido, no por liga).
7. [ ] Sin PII: query solo devuelve pronósticos del usuario — **✅** (select filtrado por `usuario_id`).
8. [ ] Móvil: chips scroll horizontal, CTA accesible — **Pendiente manual**.
9. [ ] No rompe chat, info, panel finalizado, PronosticoReminder — **✅** (sin cambios en esos bloques).

## Pendientes para UX-CLEANUP-2

- Colapsar chat en partido programado.
- Mover silenciar push a header compacto.
- Colapsar `PartidoInfoPanel` metadata por defecto.
- Horario inline en header (reducir duplicación).

## TypeScript / ESLint

```
npx tsc --noEmit: OK (exit 0)
eslint (archivos tocados): OK (exit 0)
```
