import { isPlaceholderFixtureId } from "@/lib/world-cup/knockout-match-ids";

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
};

function partidoDedupeScore(
  partido: PartidoMatchKeyFields,
  pronosticosPorPartido: Record<string, unknown>,
): number {
  let score = 0;
  if (pronosticosPorPartido[partido.id]) score += 4;
  if (!isPlaceholderFixtureId(partido.api_football_fixture_id)) score += 8;
  if (partido.estatus === "en_vivo" || partido.estatus === "medio_tiempo") {
    score += 1;
  }
  return score + (partido.api_football_fixture_id ?? 0) / 1_000_000_000_000;
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

/** Tras dedupe, enlaza pronósticos que quedaron en la fila duplicada descartada. */
export function remapPronosticosToDedupedPartidos<
  T extends PartidoMatchKeyFields,
  P extends { partido_id: string },
>(
  keptPartidos: T[],
  allPartidos: T[],
  pronosticosPorPartido: Record<string, P>,
): Record<string, P> {
  const remapped = { ...pronosticosPorPartido };

  for (const kept of keptPartidos) {
    if (remapped[kept.id]) continue;
    const key = buildPartidoMatchKey(kept);
    for (const sibling of allPartidos) {
      if (sibling.id === kept.id || buildPartidoMatchKey(sibling) !== key) continue;
      const pronostico = pronosticosPorPartido[sibling.id];
      if (pronostico) {
        remapped[kept.id] = { ...pronostico, partido_id: kept.id };
        break;
      }
    }
  }

  return remapped;
}
