# EL PITONISO — PI-2 DATOS — REPORTE

> Ejecución de **PI-2** según `PITONISO_EXECUTION_PLAN.md` (incl. §1.6 Contradicción de señales).
> Alcance: lectura Supabase + server action agregados + orquestación. **Sin** PI-3/PI-4. **Sin** cambios a PI-1 motor/copy.
>
> **Resultado:** ✅ Completado. Typecheck y lint limpios en archivos tocados.

---

## 1. Objetivos cumplidos

| # | Objetivo | Estado |
|---|----------|--------|
| PI-2.1 | `team-competition-form.ts` | ✅ |
| PI-2.2 | `pronosticos-agregados-action.ts` | ✅ |
| PI-2.3 | `pitoniso-queries.ts` | ✅ |
| PI-2.4 | Privacidad agregados (sin PII) | ✅ |
| PI-2.5 | Observación diseño §1.6 en plan | ✅ |
| PI-2.6 | `npx tsc --noEmit` | ✅ |
| PI-2.7 | Lint archivos tocados | ✅ |

---

## 2. Archivos creados / modificados

### Creados (3)

| Archivo | Rol |
|---------|-----|
| `src/lib/prediction-engine/team-competition-form.ts` | Mini-tabla grupo + forma + última jornada |
| `src/lib/quiniela/pronosticos-agregados-action.ts` | Server action picks agregados pre-lock |
| `src/lib/partidos/pitoniso-queries.ts` | Contexto estático + contradicción de señales |

### Modificados (1)

| Archivo | Cambio |
|---------|--------|
| `PITONISO_EXECUTION_PLAN.md` | + §1.6 Contradicción de señales |

**No tocados:** PI-1 (`match-preview`, `pitoniso-message`), scoring, triggers, webhooks, UI, analytics.

---

## 3. Contratos de datos

### 3.1 `fetchTeamCompetitionForm`

```ts
fetchTeamCompetitionForm(
  supabase,
  teamCode: string,
  beforeKickoffIso: string,
  limit?: number, // default 3
): Promise<TeamCompetitionForm>
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `played` | number | PJ en ventana |
| `formPoints` | number | 3/1/0 acumulado |
| `formGF` / `formGC` | number | Goles en ventana |
| `formString` | string | Ej. `"WD"` |
| `formNorm` | number \| null | 0–1; `null` si sin historial |

**Fuente:** `partidos` `finalizado`, `fecha_kickoff < beforeKickoff`, equipo local o visitante.

---

### 3.2 `fetchGroupMiniStandings`

```ts
fetchGroupMiniStandings(
  supabase,
  grupo: string,
  localTeamCode: string,
  visitanteTeamCode: string,
  beforeKickoffIso: string,
): Promise<GroupMiniStandings | null>
```

| Campo | Descripción |
|-------|-------------|
| `groupSize` | Equipos en mini-tabla |
| `teams` | Filas ordenadas (reutiliza tiebreakers existentes) |
| `local` / `visitante` | Posición, pts, `pointsFromTop2` |

**Fuente:** partidos del mismo `grupo`, `fase = grupos`, `finalizado`, antes del kickoff. Usa `calculateGroupStandingsFromPartidos`.

---

### 3.3 `fetchPronosticosPartidoAgregados` (server action)

```ts
type FetchPronosticosAgregadosResult =
  | { ok: true; picks: PickInput[]; total: number }
  | { ok: false; error: string };
```

| Regla | Detalle |
|-------|---------|
| Auth | Usuario autenticado |
| Grupo | `assertUsuarioEsMiembro` si `ligaId !== LIGA_GLOBAL_ID` |
| Estatus | Solo `programado` |
| SELECT | `goles_local, goles_visitante` únicamente |
| Respuesta | `PickInput[]` sin `usuario_id`, sin nombres |

---

### 3.4 `fetchPitonisoStaticContext`

```ts
type FetchPitonisoStaticContextResult =
  | { ok: true; context: PitonisoStaticContext }
  | { ok: false; error: string };
```

**`PitonisoStaticContext`** (serializable para props PI-3):

| Bloque | Contenido |
|--------|-----------|
| `partido` | Snapshot mínimo (equipos, fase, grupo, kickoff) |
| `phase` | `isGroupPhase`, `isKnockout`, `isLastGroupMatch` |
| `local` / `visitante` | `form`, `standing`, `teamInput`, `formDebut` |
| `groupStandings` | Mini-tabla completa o `null` |
| `signalLeaders` | `{ crowd: null, table, form }` |
| `staticSignalContradiction` | Análisis tabla vs forma |

**Helpers exportados para PI-3:**

| Función | Uso |
|---------|-----|
| `analyzePitonisoSignalContradiction(leaders)` | Contradicción completa |
| `analyzePitonisoSignalContradictionWithCrowd(static, crowd)` | Tras agregados client |
| `leaderFromCrowdOutcomes(localPct, drawPct, awayPct)` | Líder multitud |
| `toMatchPreviewPhaseFlags(phase)` | → `MatchPreviewInput` |

---

## 4. Contradicción de señales (§1.6)

### Tipos

```ts
interface PitonisoSignalLeaders {
  crowd: Outcome | null;   // null en server; PI-3 rellena
  table: Outcome | null;
  form: Outcome | null;
}

interface PitonisoSignalContradiction {
  hasContradiction: boolean;
  conflicts: ("crowd_vs_table" | "crowd_vs_form" | "table_vs_form")[];
  leaders: PitonisoSignalLeaders;
  summary: "aligned" | "crowd_vs_form" | "crowd_vs_table" | "table_vs_form" | "mixed";
}
```

### Ejemplo PI-3 (multitud vs forma)

```ts
const leaders = {
  crowd: "local",
  table: staticContext.signalLeaders.table,
  form: "visitante",
};
const contradiction = analyzePitonisoSignalContradiction(leaders);
// contradiction.summary === "crowd_vs_form"
// → copy: "El Pitoniso no está tan convencido como la multitud."
```

**PI-1 intacto:** el veredicto numérico no cambia; esto es metadata de presentación.

---

## 5. Validaciones de privacidad

| Riesgo | Mitigación implementada |
|--------|---------------------------|
| Exponer picks individuales pre-lock | SELECT solo marcadores; sin `usuario_id` en query ni respuesta |
| Exponer nombres en agregados | Sin join `usuarios` |
| Filtrar por membresía | `assertUsuarioEsMiembro` en ligas de grupo |
| Partido en vivo/finalizado | Agregados rechazan si `estatus !== programado` |
| Contexto estático | Solo datos de torneo públicos en app; sin PII |

**Wire de agregados (único campo permitido por pick):**

```json
{ "golesLocal": 2, "golesVisitante": 1 }
```

**Prohibido en respuesta:** `usuarioId`, `nombreVisible`, `puntos`, `esYo`.

---

## 6. Ejemplos de payload

### 6.1 Agregados — éxito

```json
{
  "ok": true,
  "picks": [
    { "golesLocal": 2, "golesVisitante": 1 },
    { "golesLocal": 1, "golesVisitante": 1 },
    { "golesLocal": 2, "golesVisitante": 0 }
  ],
  "total": 3
}
```

### 6.2 Agregados — partido no programado

```json
{
  "ok": false,
  "error": "Disponible solo antes del partido (estatus programado)"
}
```

### 6.3 Contexto estático — fragmento

```json
{
  "ok": true,
  "context": {
    "partido": {
      "id": "…",
      "fase": "grupos",
      "grupo": "C",
      "jornada": 2,
      "equipoLocalNombre": "México",
      "equipoVisitanteNombre": "Polonia",
      "fechaKickoff": "2026-06-18T20:00:00.000Z",
      "estatus": "programado"
    },
    "phase": {
      "isGroupPhase": true,
      "isKnockout": false,
      "isLastGroupMatch": false
    },
    "local": {
      "form": {
        "played": 2,
        "formPoints": 4,
        "formString": "WD",
        "formNorm": 0.667
      },
      "standing": {
        "position": 2,
        "points": 4,
        "pointsFromTop2": 0
      },
      "teamInput": {
        "tablePosition": 2,
        "groupSize": 4,
        "formNorm": 0.667,
        "pointsFromTop2": 0
      },
      "formDebut": false
    },
    "signalLeaders": {
      "crowd": null,
      "table": "local",
      "form": "local"
    },
    "staticSignalContradiction": {
      "hasContradiction": false,
      "conflicts": [],
      "summary": "aligned"
    }
  }
}
```

### 6.4 Contradicción tabla vs forma (estático)

```json
{
  "signalLeaders": {
    "crowd": null,
    "table": "local",
    "form": "visitante"
  },
  "staticSignalContradiction": {
    "hasContradiction": true,
    "conflicts": ["table_vs_form"],
    "summary": "table_vs_form"
  }
}
```

---

## 7. Verificación

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | ✅ Exit 0 |
| ESLint (3 archivos PI-2) | ✅ Sin errores |

---

## 8. Observaciones para PI-3

1. **Pipeline en `PitonisoCard`:**
   - Server: `fetchPitonisoStaticContext(partidoId)` → props
   - Client mount: `fetchPronosticosPartidoAgregados` → `computePickAggregates`
   - Motor: `computeMatchPreviewVerdict({ aggregates, local: ctx.local.teamInput, visitante: ctx.visitante.teamInput, ...toMatchPreviewPhaseFlags(ctx.phase) })`
   - Contradicción: `analyzePitonisoSignalContradictionWithCrowd(ctx.signalLeaders, leaderFromCrowd(...))`

2. **Copy enriquecido:** Si `contradiction.summary === "crowd_vs_form"` y veredicto ≠ multitud → *"El Pitoniso no está tan convencido como la multitud."* (PI-3 puede añadir en card sin tocar PI-1).

3. **`teamInput` ya listo** — no recalcular posición/forma en cliente.

4. **Eliminatorias:** `groupStandings = null`; motor usa defaults 0.5 en tabla.

5. **`formDebut` flags** — pasar a `buildPitonisoMessage` desde `ctx.local.formDebut`.

6. **Re-fetch agregados:** Tras guardar pronóstico, PI-3 puede re-llamar server action (picks dinámicos).

7. **Errores:** Manejar `ok: false` en card (loading/error) según plan §7.

8. **No usar** `fetchPronosticosPartidoTodos` — expone nombres y exige finalizado.

---

## 9. Qué NO se implementó (por diseño PI-2)

- ❌ `PitonisoCard`, page, analytics
- ❌ Cambios a `match-preview.ts` / `pitoniso-message.ts`
- ❌ Scoring, triggers, webhooks
- ❌ Tests automatizados (sin runner en repo)

---

*PI-2 · El Pitoniso · Datos Supabase + agregados privados · Listo para PI-3.*
