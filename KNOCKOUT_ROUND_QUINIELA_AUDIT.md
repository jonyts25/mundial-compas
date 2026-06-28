# KNOCKOUT_ROUND_QUINIELA_AUDIT

Fecha: 2026-06-18 · Rama: `master` + cambios locales P1

## FASE 1 — Respuestas

### 1. ¿La quiniela ya filtra por fase eliminatoria?

**Parcialmente.** `fetchQuinielaData` carga **todos** los partidos del torneo (`mundial_completo` no filtra por `fase`). Los partidos eliminatorios **sí están incluidos** desde P0 (32 filas KO en BD).

El filtro por fase existe **solo en grupos privados** con `tipo_quiniela = por_fase` (`filterPartidosPorTipo` + `QuinielaTipoFilters`).

**P1:** agrupación visual por ronda en `QuinielaList` (global y grupos).

---

### 2. ¿Los partidos aparecen agrupados por ronda?

**Antes de P1:** lista plana ordenada por kickoff.

**Después de P1:** sí — secciones colapsables por ronda (`QuinielaRoundSection` + `groupPartidosByQuinielaRound`).

| Sección UI | `fase` en BD |
|------------|--------------|
| Fase de grupos | `grupos` |
| Ronda de 32 | `dieciseisavos` |
| Octavos | `octavos` |
| Cuartos | `cuartos` |
| Semifinales | `semifinal` |
| Tercer lugar | `tercer_lugar` |
| Final | `final` |

---

### 3. ¿El usuario puede pronosticar únicamente la ronda vigente?

**No exclusivamente** — puede pronosticar **cualquier partido abierto** (kickoff futuro) con equipos confirmados, en cualquier ronda.

Comportamiento correcto para quiniela completa del Mundial:

- R32: 16 cruces confirmados → pronosticables ya
- Octavos+: bloqueados hasta `resolve-knockout-participants` confirme ambos equipos
- Filtro **Pendientes** muestra solo partidos realmente abiertos (excluye TBD)

No se restringe a “solo la ronda actual” porque el reglamento permite adelantar picks en rondas ya definidas (p. ej. R32 antes de que empiecen octavos).

---

### 4. ¿Partidos futuros TBD ocultos hasta equipos definidos?

**Sí, con matices (P0 + P1):**

| Filtro | TBD knockout |
|--------|----------------|
| Pendientes / Hoy / Próximos | Ocultos |
| Todos | Visibles, inputs bloqueados (`PronosticoRow`) |
| Sección de ronda (P1) | Mensaje *«Se habilitará cuando se definan los clasificados.»* sin filas vacías |

Server guard en `savePronostico` (sin cambios P1).

---

### 5. ¿El cierre por kickoff sigue funcionando?

**Sí.** `isPronosticoLocked` en `PronosticoRow`, `QuinielaList`, `savePronostico` — sin cambios.

---

### 6. ¿Los grupos privados funcionan igual?

**Sí.** Misma `QuinielaList` con agrupación por ronda. Filtros `por_fase` / `por_jornada` del grupo siguen aplicándose **antes** de renderizar la lista.

---

### 7. ¿Leaderboard sigue contando todas las rondas?

**Sí.** `fetchLeaderboard` / RPC de puntos no filtran por fase. Todos los pronósticos puntuables de grupos + eliminatoria cuentan igual.

---

## Inventario de código relevante

| Área | Archivo |
|------|---------|
| Fetch quiniela | `src/lib/quiniela/queries.ts` |
| Lista + rondas P1 | `src/components/quiniela/QuinielaList.tsx` |
| Sección colapsable | `src/components/quiniela/QuinielaRoundSection.tsx` |
| Lógica rondas | `src/lib/quiniela/knockout-rounds.ts` |
| TBD / pronosticable | `src/lib/world-cup/knockout-participant-utils.ts` |
| Guard save | `src/lib/quiniela/actions.ts` (no tocado P1) |
| Pitoniso skip | `src/lib/partidos/pitoniso-queries.ts` (no tocado P1) |
| Home siguiente pick | `src/lib/quiniela/next-pending-prediction.ts` |
| Home dashboard | `src/lib/home/home-dashboard-queries.ts` |

## Estado BD (referencia P0)

- 104 partidos (72 grupos + 32 KO)
- R32: 16/16 equipos confirmados
- R16→Final: slots TBD hasta resultados reales
