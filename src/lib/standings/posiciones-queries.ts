import { getCachedGroupStandings } from "@/lib/standings/cache";
import {
  calculateGroupStandingsFromPartidos,
  standingsHasResults,
  type PartidoGrupoRow,
} from "@/lib/standings/calculate-group-standings";
import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";
import { buildKnockoutBracket } from "@/lib/standings/build-knockout-bracket";
import type { KnockoutBracket } from "@/lib/standings/knockout-bracket-types";
import type { GroupStandingsSnapshot } from "@/lib/standings/types";
import type { Partido } from "@/types/database";
import {
  isWorldCupGroupLetter,
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import { createClient } from "@/lib/supabase/server";

const PARTIDO_GRUPO_SELECT =
  "id, fase, grupo, jornada, sede, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, metadata";

export interface PosicionesMundialData {
  snapshot: GroupStandingsSnapshot;
  partidosPorGrupo: Record<WorldCupGroupLetter, Partido[]>;
  bestThirdPlaces: ReturnType<typeof buildBestThirdPlacesRanking>;
  knockoutBracket: KnockoutBracket;
  groupStageComplete: boolean;
  hasLiveGroupMatches: boolean;
  source: "partidos" | "api" | "partidos+api";
  calculatedAt: string;
}

export async function fetchPosicionesMundialData(): Promise<PosicionesMundialData> {
  const supabase = await createClient();

  const { data: partidosRaw, error } = await supabase
    .from("partidos")
    .select(PARTIDO_GRUPO_SELECT)
    .eq("fase", "grupos")
    .not("grupo", "is", null)
    .order("fecha_kickoff", { ascending: true });

  if (error) throw new Error(error.message);

  const partidos = (partidosRaw ?? []) as Partido[];
  const partidosGrupoRows: PartidoGrupoRow[] = partidos.map((p) => ({
    id: p.id,
    grupo: p.grupo,
    fase: p.fase,
    equipo_local_codigo: p.equipo_local_codigo,
    equipo_visitante_codigo: p.equipo_visitante_codigo,
    equipo_local_nombre: p.equipo_local_nombre,
    equipo_visitante_nombre: p.equipo_visitante_nombre,
    marcador_local: p.marcador_local,
    marcador_visitante: p.marcador_visitante,
    estatus: p.estatus,
  }));

  const { groups: calculatedGroups } =
    calculateGroupStandingsFromPartidos(partidosGrupoRows);

  let snapshot: GroupStandingsSnapshot;
  let source: PosicionesMundialData["source"] = "partidos";

  if (standingsHasResults(calculatedGroups)) {
    snapshot = {
      leagueId: "28",
      leagueName: "Mundial FIFA 2026",
      fetchedAt: new Date().toISOString(),
      groups: calculatedGroups,
    };
  } else {
    try {
      const apiSnapshot = await getCachedGroupStandings();
      const apiGroups = apiSnapshot.groups.filter((g) =>
        isWorldCupGroupLetter(g.groupKey),
      );
      if (apiGroups.length > 0) {
        snapshot = {
          ...apiSnapshot,
          groups: WORLD_CUP_GROUP_LETTERS.map((letter) => {
            const found = apiGroups.find((g) => g.groupKey === letter);
            return (
              found ?? {
                groupKey: letter,
                groupLabel: `Grupo ${letter}`,
                teams: [],
              }
            );
          }),
        };
        source = "api";
      } else {
        snapshot = {
          leagueId: "28",
          leagueName: "Mundial FIFA 2026",
          fetchedAt: new Date().toISOString(),
          groups: calculatedGroups,
        };
      }
    } catch {
      snapshot = {
        leagueId: "28",
        leagueName: "Mundial FIFA 2026",
        fetchedAt: new Date().toISOString(),
        groups: calculatedGroups,
      };
    }
  }

  const partidosPorGrupo = {} as Record<WorldCupGroupLetter, Partido[]>;
  for (const letter of WORLD_CUP_GROUP_LETTERS) {
    partidosPorGrupo[letter] = partidos.filter(
      (p) => p.grupo?.toUpperCase() === letter,
    );
  }

  const bestThirdPlaces = buildBestThirdPlacesRanking(snapshot.groups);
  const knockoutBracket = buildKnockoutBracket({
    groups: snapshot.groups,
    bestThirdPlaces,
    partidos: partidosGrupoRows,
  });

  const hasLiveGroupMatches = partidos.some(
    (p) => p.estatus === "en_vivo" || p.estatus === "medio_tiempo",
  );

  return {
    snapshot,
    partidosPorGrupo,
    bestThirdPlaces,
    knockoutBracket,
    groupStageComplete: knockoutBracket.groupStageComplete,
    hasLiveGroupMatches,
    source,
    calculatedAt: new Date().toISOString(),
  };
}
