import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTeamNameForMatch } from "@/lib/partidos/partido-match-key";

const PARTIDO_SELECT =
  "id, metadata, estatus, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante, fecha_kickoff, api_football_fixture_id, fase";

export type PartidoNotifyRow = {
  id: string;
  metadata: Record<string, unknown> | null;
  estatus: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  fecha_kickoff: string;
  api_football_fixture_id: number | null;
  fase: string;
};

function teamTokens(query: string): string[] {
  return query
    .split(/[,|/]+/)
    .map((t) => normalizeTeamNameForMatch(t.trim()))
    .filter(Boolean);
}

function matchesTeamPair(
  local: string,
  visitante: string,
  tokens: string[],
): boolean {
  if (tokens.length < 2) return false;
  const pair = `${normalizeTeamNameForMatch(local)} ${normalizeTeamNameForMatch(visitante)}`;
  return tokens.every((token) => pair.includes(token));
}

/** Busca partido en vivo o reciente por nombres de selección (ej. México,Ecuador). */
export async function findPartidoByTeams(
  supabase: SupabaseClient,
  teamsQuery: string,
): Promise<PartidoNotifyRow | null> {
  const tokens = teamTokens(teamsQuery);
  if (tokens.length < 2) return null;

  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("partidos")
    .select(PARTIDO_SELECT)
    .gte("fecha_kickoff", since)
    .order("fecha_kickoff", { ascending: false });

  if (error) throw new Error(error.message);

  const matches = (data ?? []).filter((row) =>
    matchesTeamPair(
      String(row.equipo_local_nombre),
      String(row.equipo_visitante_nombre),
      tokens,
    ),
  ) as PartidoNotifyRow[];

  if (matches.length === 0) return null;

  const live = matches.find(
    (m) => m.estatus === "en_vivo" || m.estatus === "medio_tiempo",
  );
  return live ?? matches[0] ?? null;
}

export function summarizeNotifyMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {};
  const m = metadata as Record<string, unknown>;
  const reloj =
    m.reloj && typeof m.reloj === "object"
      ? (m.reloj as Record<string, unknown>)
      : null;
  return {
    announced_phases: m.announced_phases ?? null,
    gol_notify_score: m.gol_notify_score ?? null,
    reloj_period: reloj?.period ?? null,
    reloj_minute: reloj?.anchorMinute ?? null,
  };
}
