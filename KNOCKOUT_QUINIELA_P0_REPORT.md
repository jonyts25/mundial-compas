# KNOCKOUT_QUINIELA_P0_REPORT

Ejecución P0 — Quiniela fase eliminatoria Mundial 2026.

## Resumen

| Item | Estado |
|------|--------|
| Partidos KO insertados | **32** |
| Partidos KO actualizados (participantes) | **32** |
| Total BD | **104** (72 + 32) |
| R32 pronosticables | **16/16** equipos confirmados |
| R16+ pronosticables | **0/16** (TBD hasta ganadores) |
| Quiniela UI KO | ✅ Muestra + bloquea TBD |
| Pitoniso KO TBD | ✅ No corre |
| Scoring / savePronostico core | Sin cambios de reglas de puntos |
| Migraciones | Ninguna |
| Commit | **No** (por instrucción) |

## Comandos ejecutados (prod)

```bash
node scripts/upsert-world-cup-knockout-fixtures.mjs --dry-run
node scripts/upsert-world-cup-knockout-fixtures.mjs          # 32 insertados (2 pasadas)
node scripts/resolve-world-cup-knockout-participants.mjs --dry-run
node scripts/resolve-world-cup-knockout-participants.mjs     # 32 patches aplicados
```

## Fases disponibles en quiniela

Con `tipoQuiniela = mundial_completo` (default global):

- Fase de grupos (72 partidos, cerrados)
- **Dieciseisavos** — 16 abiertos para pronóstico
- Octavos / Cuartos / Semis / 3.er / Final — visibles en filtro «Todos», pronóstico bloqueado (TBD)

## Qué quedó TBD

| Ronda | Partidos | Motivo |
|-------|----------|--------|
| Octavos | 8 | Esperan ganadores R32 |
| Cuartos | 4 | Esperan ganadores R16 |
| Semifinal | 2 | Esperan ganadores QF |
| Tercer lugar | 1 | Esperan perdedores SF |
| Final | 1 | Esperan ganadores SF |

Labels en UI: `Ganador P89`, `1.º Grupo A`, `Equipo por definir`, etc.

## Penales en quiniela

**No soportados explícitamente.** Pronóstico = marcador tiempo reglamentario (regla actual). Documentado en `PronosticoRow` para KO. Resolución de bracket post-partido: empate en 90' no asigna ganador hasta que API/sync refleje resultado final.

## Archivos nuevos / modificados

### Nuevos
- `src/lib/world-cup/knockout-match-ids.ts`
- `src/lib/world-cup/knockout-participant-utils.ts`
- `src/lib/world-cup/build-knockout-fixture-rows.ts`
- `src/lib/world-cup/resolve-knockout-participants.ts`
- `src/lib/world-cup/run-upsert-knockout-fixtures.ts`
- `src/lib/world-cup/run-resolve-knockout-participants.ts`
- `src/lib/world-cup/resolve-knockout-participants.test.ts`
- `scripts/upsert-world-cup-knockout-fixtures.mjs`
- `scripts/resolve-world-cup-knockout-participants.mjs`
- `scripts/knockout-upsert-cli.ts`, `knockout-resolve-cli.ts`

### UI / guardas
- `PronosticoRow.tsx` — TBD badge, inputs deshabilitados
- `QuinielaList.tsx` — pendientes solo si pronosticables
- `quiniela/actions.ts` — guard server TBD
- `pitoniso-queries.ts` — skip TBD
- `partidos/[id]/page.tsx` — esPronosticable con KO rules

## Validaciones

| Check | Resultado |
|-------|-----------|
| `npm run test:core` | ✅ 118 tests |
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |
| Duplicados fixture_id | ✅ 0 |
| Idempotencia upsert (2ª corrida) | ✅ toInsert=0 |

## Riesgos

1. **API fixture ids** — Placeholders sintéticos; al cargar API-Sports hay que fusionar sin duplicar (usar `cargar-partidos` + align).
2. **Cron resolve** — Tras cada jornada KO conviene correr `resolve-world-cup-knockout-participants.mjs` (manual o cron Railway).
3. **Empate + penales** — Bracket no avanza hasta marcador decisivo en BD; sync-live debe reflejar winner API.
4. **Hora kickoff** — Placeholders usan mediodía CDMX; se actualiza al sincronizar API.
5. **Stash pendiente** — `wip datos mamalones before knockout-quiniela-p0` sigue en stash local.

## Git status

```
## master...origin/master
 M package-lock.json (+ npm install local)
 M UI/quiniela/actions/pitoniso/knockout-placeholder-rows
 ?? scripts + src/lib/world-cup/*
 ?? KNOCKOUT_*.md
```

## Próximos pasos sugeridos

1. Deploy app con cambios UI/guardas.
2. Cron post-sync-live: `resolve-world-cup-knockout-participants.mjs`.
3. Cuando API publique KO: `cargar-partidos` para reemplazar placeholders con ids reales.
4. Recuperar stash datos mamalones si aplica.
