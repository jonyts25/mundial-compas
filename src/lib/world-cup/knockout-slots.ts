/**
 * Helpers puros para slots de dieciseisavos — reutiliza Annex C existente.
 * Sin UI, sin BD, sin API.
 */

import { buildKnockoutBracket } from "@/lib/standings/build-knockout-bracket";
import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import type {
  KnockoutBracket,
  KnockoutMatch,
  KnockoutTeamSlot,
} from "@/lib/standings/knockout-bracket-types";
import type { StandingGroup } from "@/lib/standings/types";
import type { ThirdPlaceHostGroup } from "@/lib/standings/world-cup-third-place-scenarios";
import { lookupThirdPlaceScenario } from "@/lib/standings/world-cup-third-place-scenarios";
import {
  BEST_THIRD_PLACES_QUALIFY_COUNT,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import { WORLD_CUP_R32_FIXTURES } from "@/lib/standings/world-cup-r32-fixtures";

export type { KnockoutBracket, KnockoutMatch, KnockoutTeamSlot };

/** Etiqueta FIFA cuando Annex C aún no aplica (menos de 8 terceros definidos). */
export function thirdPlaceSlotPlaceholder(
  winnerGroup: ThirdPlaceHostGroup,
): string {
  return `3º clasificado vs 1.º Grupo ${winnerGroup} (combinación FIFA por definir)`;
}

export function scenarioKeyFromThirdGroups(
  groups: WorldCupGroupLetter[],
): string | null {
  if (groups.length !== BEST_THIRD_PLACES_QUALIFY_COUNT) return null;
  return [...groups].sort().join("");
}

export function resolveAnnexCAssignments(
  qualifyingThirdGroups: WorldCupGroupLetter[],
) {
  if (qualifyingThirdGroups.length !== BEST_THIRD_PLACES_QUALIFY_COUNT) {
    return null;
  }
  return lookupThirdPlaceScenario(qualifyingThirdGroups);
}

export function computeRoundOf32Slots(input: {
  groups: StandingGroup[];
  bestThirdPlaces: BestThirdPlaceRow[];
  partidos: PartidoGrupoRow[];
}): KnockoutBracket {
  return buildKnockoutBracket({
    groups: input.groups,
    bestThirdPlaces: input.bestThirdPlaces,
    partidos: input.partidos,
  });
}

export interface ProvisionalOpponentResult {
  matchNumber: number;
  side: "home" | "away";
  opponent: KnockoutTeamSlot;
  teamSlot: KnockoutTeamSlot;
  isProvisional: boolean;
}

/** Busca el cruce de dieciseisavos donde participa `teamId` (código equipo). */
export function getProvisionalOpponent(
  teamId: string,
  bracket: KnockoutBracket,
): ProvisionalOpponentResult | null {
  for (const match of bracket.matches) {
    if (match.home.teamId === teamId) {
      return {
        matchNumber: match.matchNumber,
        side: "home",
        teamSlot: match.home,
        opponent: match.away,
        isProvisional:
          !match.isDefined || match.home.isProvisional || match.away.isProvisional,
      };
    }
    if (match.away.teamId === teamId) {
      return {
        matchNumber: match.matchNumber,
        side: "away",
        teamSlot: match.away,
        opponent: match.home,
        isProvisional:
          !match.isDefined || match.home.isProvisional || match.away.isProvisional,
      };
    }
  }
  return null;
}

/** Cruces R32 que involucran a un tercero vía Annex C (slots third_vs_winner). */
export function listThirdPlaceHostGroups(): ThirdPlaceHostGroup[] {
  const hosts = new Set<ThirdPlaceHostGroup>();
  for (const fx of WORLD_CUP_R32_FIXTURES) {
    if (fx.home.kind === "third_vs_winner") hosts.add(fx.home.winnerGroup);
    if (fx.away.kind === "third_vs_winner") hosts.add(fx.away.winnerGroup);
  }
  return [...hosts].sort();
}
