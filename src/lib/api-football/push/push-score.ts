import type { MatchPeriod } from "@/lib/partidos/match-clock";
import { displayTeamPair, getTeamDisplayNameEs } from "@/lib/teams/display-names";

export type PenaltyScorePair = { home: number; away: number };

export function isPenaltyShootoutActive(
  period: MatchPeriod,
  homePen: number | null,
  awayPen: number | null,
): boolean {
  if (period === "PEN") return true;
  if (period === "AP") return homePen != null || awayPen != null;
  return homePen != null && awayPen != null;
}

export function resolvePenaltyScores(
  homePen: number | null,
  awayPen: number | null,
): PenaltyScorePair | null {
  if (homePen == null && awayPen == null) return null;
  return { home: homePen ?? 0, away: awayPen ?? 0 };
}

export function scoresForLiveDisplay(params: {
  period: MatchPeriod;
  homeScore: number;
  awayScore: number;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
}): { local: number; visitante: number } {
  if (
    isPenaltyShootoutActive(
      params.period,
      params.homePenaltyScore,
      params.awayPenaltyScore,
    )
  ) {
    return {
      local: params.homePenaltyScore ?? 0,
      visitante: params.awayPenaltyScore ?? 0,
    };
  }
  return { local: params.homeScore, visitante: params.awayScore };
}

export function buildGoalPushTitle(params: {
  localName: string;
  visitanteName: string;
  homeScore: number;
  awayScore: number;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  period: MatchPeriod;
}): string {
  const { homeScore, awayScore, period } = params;
  const { local, visitante } = displayTeamPair(
    params.localName,
    params.visitanteName,
  );
  const live = scoresForLiveDisplay(params);

  if (
    isPenaltyShootoutActive(
      period,
      params.homePenaltyScore,
      params.awayPenaltyScore,
    )
  ) {
    return `⚽ Penal: ${local} ${live.local}-${live.visitante} ${visitante}`;
  }

  return `⚽ Gol: ${local} ${homeScore}-${awayScore} ${visitante}`;
}

export type MatchWinnerResult = {
  winner: string;
  loser: string;
  isDraw: boolean;
  wonOnPenalties: boolean;
};

export function resolveMatchWinner(params: {
  localName: string;
  visitanteName: string;
  homeScore: number;
  awayScore: number;
  penaltyScores: PenaltyScorePair | null;
}): MatchWinnerResult {
  const local = getTeamDisplayNameEs(params.localName);
  const visitante = getTeamDisplayNameEs(params.visitanteName);

  if (params.penaltyScores) {
    const { home, away } = params.penaltyScores;
    if (home === away) {
      return { winner: "", loser: "", isDraw: true, wonOnPenalties: false };
    }
    return {
      winner: home > away ? local : visitante,
      loser: home > away ? visitante : local,
      isDraw: false,
      wonOnPenalties: true,
    };
  }

  if (params.homeScore === params.awayScore) {
    return { winner: "", loser: "", isDraw: true, wonOnPenalties: false };
  }

  return {
    winner: params.homeScore > params.awayScore ? local : visitante,
    loser: params.homeScore > params.awayScore ? visitante : local,
    isDraw: false,
    wonOnPenalties: false,
  };
}

export function buildFulltimePushTitle(params: {
  localName: string;
  visitanteName: string;
  homeScore: number;
  awayScore: number;
  penaltyScores: PenaltyScorePair | null;
  isFinalMatch?: boolean;
}): string {
  const result = resolveMatchWinner(params);

  if (result.isDraw) {
    return params.isFinalMatch ? "🏁 Final" : "🏁 Final del partido";
  }

  if (params.isFinalMatch) {
    return `🏆 ¡Campeón: ${result.winner}!`;
  }

  return `🏁 Gana ${result.winner}`;
}

export function buildFulltimePushBody(params: {
  localName: string;
  visitanteName: string;
  homeScore: number;
  awayScore: number;
  penaltyScores: PenaltyScorePair | null;
}): string {
  const { local, visitante } = displayTeamPair(
    params.localName,
    params.visitanteName,
  );
  const reg = `${local} ${params.homeScore}-${params.awayScore} ${visitante}`;
  const result = resolveMatchWinner(params);

  if (result.isDraw) {
    return `Marcador final: ${reg}. Empate.`;
  }

  if (result.wonOnPenalties && params.penaltyScores) {
    const { home, away } = params.penaltyScores;
    return `¡Gana ${result.winner}! ${reg} (${result.winner} ${home}-${away} en penales)`;
  }

  return `¡Gana ${result.winner}! Marcador final: ${reg}`;
}
