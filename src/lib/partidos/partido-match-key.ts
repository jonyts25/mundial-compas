import { toMexicoDateKey } from "@/lib/datetime/mexico";
import { extractFifaMatchNumber } from "@/lib/standings/knockout-schedule-utils";
import { calcularPuntosPronostico } from "@/lib/world-cup/knockout-quiniela-rules";
import { isPlaceholderFixtureId } from "@/lib/world-cup/knockout-match-ids";
import type { Partido } from "@/types/database";

/** Normaliza nombres de selección para emparejar el mismo partido entre proveedores. */
export function normalizeTeamNameForMatch(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+islands$/i, "")
    .replace(/^türkiye$/i, "turkey")
    .replace(/^turkiye$/i, "turkey")
    .replace(/^czechia$/i, "czech republic")
    .replace(/^curaçao$/i, "curacao")
    .replace(/\s+/g, " ");

  return normalizeDrCongoAlias(normalized);
}

/** Congo DR / D.R. Congo / DR Congo → misma clave (apifootball vs api-sports). */
function normalizeDrCongoAlias(name: string): string {
  if (!name.includes("congo")) return name;

  const isDrCongo =
    name.includes("congo dr") ||
    name.includes("dr congo") ||
    name.includes("d.r. congo") ||
    name.includes("d r congo") ||
    name.includes("democratic republic") ||
    name.includes("rep dem") ||
    /^dr\.?\s*congo/.test(name);

  if (isDrCongo) return "congo dr";
  return name;
}

export function buildTeamPairKey(input: {
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
}): string {
  const local = normalizeTeamNameForMatch(input.equipo_local_nombre);
  const away = normalizeTeamNameForMatch(input.equipo_visitante_nombre);
  return `${local}|${away}`;
}

export function buildPartidoMatchKey(input: {
  fecha_kickoff: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
}): string {
  const local = normalizeTeamNameForMatch(input.equipo_local_nombre);
  const away = normalizeTeamNameForMatch(input.equipo_visitante_nombre);
  return `${input.fecha_kickoff}|${local}|${away}`;
}

export type PartidoMatchKeyFields = {
  id: string;
  fecha_kickoff: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  api_football_fixture_id?: number | null;
  estatus?: string;
  fase?: string;
  metadata?: unknown;
  sede?: string | null;
  marcador_local?: number | null;
  marcador_visitante?: number | null;
};

function readKnockoutMatchId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const koId = (metadata as Record<string, unknown>).knockout_match_id;
  return typeof koId === "string" && koId.length > 0 ? koId : null;
}

function extractFifaFromFields(partido: PartidoMatchKeyFields): number | null {
  return extractFifaMatchNumber(partido as unknown as Partido);
}

/** Clave de dedupe para UI: KO por slot FIFA, grupos por kickoff exacto. */
export function buildPartidoDisplayDedupeKey(
  partido: PartidoMatchKeyFields,
): string {
  if (partido.fase && partido.fase !== "grupos") {
    const koId = readKnockoutMatchId(partido.metadata);
    if (koId) return `ko:${koId}`;
    const fifa =
      partido.metadata && typeof partido.metadata === "object"
        ? (partido.metadata as Record<string, unknown>).fifa_match_number
        : null;
    if (typeof fifa === "number") return `fifa:${fifa}`;
    const fromMeta = extractFifaFromFields(partido);
    if (fromMeta != null) return `fifa:${fromMeta}`;
    return `ko-day:${buildTeamPairKey(partido)}|${toMexicoDateKey(partido.fecha_kickoff)}`;
  }
  return buildPartidoMatchKey(partido);
}

function partidoDedupeScore(
  partido: PartidoMatchKeyFields,
  pronosticosPorPartido: Record<string, unknown>,
): number {
  let score = 0;
  if (pronosticosPorPartido[partido.id]) score += 4;
  if (!isPlaceholderFixtureId(partido.api_football_fixture_id)) score += 8;
  if (readKnockoutMatchId(partido.metadata)) score += 16;
  if (partido.estatus === "en_vivo" || partido.estatus === "medio_tiempo") {
    score += 1;
  }
  return score + (partido.api_football_fixture_id ?? 0) / 1_000_000_000_000;
}

/** Prioriza fila canonical al indexar partidos KO por número FIFA (cuadro, resolución). */
export function scoreKnockoutPartidoForIndex(
  partido: PartidoMatchKeyFields,
): number {
  let score = partidoDedupeScore(partido, {});
  if (partido.estatus === "finalizado") score += 32;
  if (partido.estatus === "en_vivo" || partido.estatus === "medio_tiempo") {
    score += 16;
  }
  if (
    partido.marcador_local != null &&
    partido.marcador_visitante != null
  ) {
    score += 4;
  }
  return score;
}

function pickBestPartidoByScore<T extends PartidoMatchKeyFields>(
  current: T | undefined,
  candidate: T,
  scoreFn: (partido: PartidoMatchKeyFields) => number,
): T {
  if (!current) return candidate;
  return scoreFn(candidate) > scoreFn(current) ? candidate : current;
}

/**
 * Quita fixtures api-sports huérfanos (sin knockout_match_id ni slot FIFA) que
 * duplican la misma ronda en quiniela/calendario.
 */
export function filterOrphanKnockoutApiFixtures<T extends PartidoMatchKeyFields>(
  partidos: T[],
): T[] {
  const knockout = partidos.filter((p) => p.fase && p.fase !== "grupos");
  const indexed = indexKnockoutByFifa(knockout);

  return partidos.filter((partido) => {
    if (!partido.fase || partido.fase === "grupos") return true;
    if (readKnockoutMatchId(partido.metadata)) return true;
    if (isPlaceholderFixtureId(partido.api_football_fixture_id)) return true;

    const fifa = extractFifaFromFields(partido);
    if (fifa != null) {
      const canonical = indexed.get(fifa);
      return !canonical || canonical.id === partido.id;
    }

    if (partido.fase === "dieciseisavos") {
      return false;
    }

    return true;
  });
}

function indexKnockoutByFifa<T extends PartidoMatchKeyFields>(
  partidos: T[],
): Map<number, T> {
  const map = new Map<number, T>();
  for (const partido of partidos) {
    const fifa = extractFifaFromFields(partido);
    if (fifa == null) continue;
    map.set(
      fifa,
      pickBestPartidoByScore(map.get(fifa), partido, scoreKnockoutPartidoForIndex),
    );
  }
  return map;
}

/** Dedupe para quiniela/calendario: evita duplicados KO y prioriza fixture real. */
export function dedupePartidosForDisplay<T extends PartidoMatchKeyFields>(
  partidos: T[],
  pronosticosPorPartido: Record<string, unknown> = {},
): T[] {
  const filtered = filterOrphanKnockoutApiFixtures(partidos);
  const byKey = new Map<string, T>();

  for (const partido of filtered) {
    const key = buildPartidoDisplayDedupeKey(partido);
    const existing = byKey.get(key);
    const candidateScore =
      scoreKnockoutPartidoForIndex(partido) +
      (pronosticosPorPartido[partido.id] ? 4 : 0);
    const existingScore = existing
      ? scoreKnockoutPartidoForIndex(existing) +
        (pronosticosPorPartido[existing.id] ? 4 : 0)
      : -1;
    if (!existing || candidateScore > existingScore) {
      byKey.set(key, partido);
    }
  }

  return [...byKey.values()].sort(
    (a, b) =>
      new Date(a.fecha_kickoff).getTime() - new Date(b.fecha_kickoff).getTime(),
  );
}

/** Dedupe partidos del mismo encuentro; prioriza fixture real api-sports y pronósticos. */
export function dedupePartidosByMatchKey<T extends PartidoMatchKeyFields>(
  partidos: T[],
  pronosticosPorPartido: Record<string, unknown> = {},
): T[] {
  const byKey = new Map<string, T>();

  for (const partido of partidos) {
    const key = buildPartidoMatchKey(partido);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, partido);
      continue;
    }

    if (
      partidoDedupeScore(partido, pronosticosPorPartido) >
      partidoDedupeScore(existing, pronosticosPorPartido)
    ) {
      byKey.set(key, partido);
    }
  }

  return [...byKey.values()].sort(
    (a, b) =>
      new Date(a.fecha_kickoff).getTime() - new Date(b.fecha_kickoff).getTime(),
  );
}

/** Elige la fila canonical entre duplicados del mismo slot KO (p. ej. placeholder vs api-sports). */
export function resolveCanonicalSiblingFromList<T extends PartidoMatchKeyFields>(
  partido: T,
  siblings: T[],
): T | null {
  const key = buildPartidoDisplayDedupeKey(partido);
  const candidates = siblings.filter(
    (row) => row.id !== partido.id && buildPartidoDisplayDedupeKey(row) === key,
  );
  if (candidates.length === 0) return null;

  let best = partido;
  for (const candidate of candidates) {
    if (scoreKnockoutPartidoForIndex(candidate) > scoreKnockoutPartidoForIndex(best)) {
      best = candidate;
    }
  }
  return best.id === partido.id ? null : best;
}

type PronosticoConMarcador = {
  goles_local: number;
  goles_visitante: number;
  puntos: number;
};

/** Calcula puntos en lectura cuando el pronóstico quedó en un duplicado legacy. */
export function enrichPronosticoPuntosFromPartido<
  P extends PronosticoConMarcador,
  T extends PartidoMatchKeyFields,
>(partido: T, pronostico: P): P {
  if (
    partido.estatus !== "finalizado" ||
    partido.marcador_local == null ||
    partido.marcador_visitante == null
  ) {
    return pronostico;
  }

  return {
    ...pronostico,
    puntos: calcularPuntosPronostico(
      partido.marcador_local,
      partido.marcador_visitante,
      pronostico.goles_local,
      pronostico.goles_visitante,
    ),
  };
}

/** Tras dedupe, enlaza pronósticos que quedaron en la fila duplicada descartada. */
export function remapPronosticosToDedupedPartidos<
  T extends PartidoMatchKeyFields,
  P extends { partido_id: string } & Partial<PronosticoConMarcador>,
>(
  keptPartidos: T[],
  allPartidos: T[],
  pronosticosPorPartido: Record<string, P>,
): Record<string, P> {
  const remapped = { ...pronosticosPorPartido };

  for (const kept of keptPartidos) {
    let pronostico = remapped[kept.id];
    if (!pronostico) {
      const key = buildPartidoDisplayDedupeKey(kept);
      for (const sibling of allPartidos) {
        if (sibling.id === kept.id || buildPartidoDisplayDedupeKey(sibling) !== key) {
          continue;
        }
        const siblingPronostico = pronosticosPorPartido[sibling.id];
        if (siblingPronostico) {
          pronostico = { ...siblingPronostico, partido_id: kept.id };
          break;
        }
      }
    }

    if (!pronostico) continue;

    const mapped = { ...pronostico, partido_id: kept.id } as P;
    if (
      typeof pronostico.goles_local === "number" &&
      typeof pronostico.goles_visitante === "number"
    ) {
      remapped[kept.id] = {
        ...mapped,
        ...enrichPronosticoPuntosFromPartido(kept, {
          goles_local: pronostico.goles_local,
          goles_visitante: pronostico.goles_visitante,
          puntos: pronostico.puntos ?? 0,
        }),
      } as P;
    } else {
      remapped[kept.id] = mapped;
    }
  }

  return remapped;
}
