import type { FaseMundial } from "@/types/database";

export interface FaseGrupoParse {
  fase: FaseMundial;
  grupo: string | null;
  jornada: number | null;
}

/** Parsea fase/grupo/jornada desde textos de API (stage, round, league). */
export function parseFaseGrupoFromTexts(
  stageName?: string | null,
  matchRound?: string | null,
  leagueName?: string | null,
): FaseGrupoParse {
  const stage = String(stageName ?? "").toLowerCase();
  const round = String(matchRound ?? "").toLowerCase();
  const league = String(leagueName ?? "").toLowerCase();

  const groupMatch =
    stage.match(/group\s*([a-l])\b/i) ??
    round.match(/group\s*([a-l])\b/i) ??
    league.match(/group\s*([a-l])\b/i) ??
    round.match(/\b([a-l])\s*[-–]\s*\d/i);
  if (groupMatch || stage.includes("group") || league.includes("group")) {
    const jornadaMatch = round.match(/(\d+)/);
    return {
      fase: "grupos",
      grupo: groupMatch?.[1]?.toUpperCase() ?? null,
      jornada: jornadaMatch ? Number.parseInt(jornadaMatch[1], 10) || null : null,
    };
  }

  if (round.includes("16") || stage.includes("round of 16")) {
    return { fase: "dieciseisavos", grupo: null, jornada: null };
  }
  if (round.includes("8") || stage.includes("quarter")) {
    return { fase: "cuartos", grupo: null, jornada: null };
  }
  if (stage.includes("semi")) {
    return { fase: "semifinal", grupo: null, jornada: null };
  }
  if (stage.includes("3rd") || stage.includes("third")) {
    return { fase: "tercer_lugar", grupo: null, jornada: null };
  }
  if (
    (stage.includes("final") && !stage.includes("semi")) ||
    round === "final"
  ) {
    return { fase: "final", grupo: null, jornada: null };
  }
  if (round.includes("32") || stage.includes("round of 32")) {
    return { fase: "dieciseisavos", grupo: null, jornada: null };
  }

  return { fase: "grupos", grupo: null, jornada: null };
}

/** Lee stage/round guardados en metadata.apifootball al cargar partidos. */
export function parseFaseGrupoFromMetadata(
  metadata: unknown,
): FaseGrupoParse | null {
  if (!metadata || typeof metadata !== "object") return null;
  const root = metadata as Record<string, unknown>;
  const apif =
    root.apifootball && typeof root.apifootball === "object"
      ? (root.apifootball as Record<string, unknown>)
      : root;

  const stage = apif.stage_name as string | undefined;
  const round = (apif.match_round ?? apif.round) as string | undefined;
  const league = apif.league_name as string | undefined;

  if (!stage && !round && !league) return null;

  return parseFaseGrupoFromTexts(stage, round, league);
}
