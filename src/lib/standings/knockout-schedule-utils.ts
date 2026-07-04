import { knockoutKickoffIso } from "@/lib/standings/world-cup-knockout-kickoffs";
import { formatMexicoDateLabel, formatMexicoKickoff, toMexicoDateKey } from "@/lib/datetime/mexico";
import type { KnockoutFeedSlot } from "@/lib/standings/world-cup-knockout-schedule";
import {
  KNOCKOUT_SCHEDULE_BY_MATCH,
  type KnockoutScheduleEntry,
} from "@/lib/standings/world-cup-knockout-schedule";
import {
  scoreKnockoutPartidoForIndex,
  type PartidoMatchKeyFields,
} from "@/lib/partidos/partido-match-key";
import type { Partido } from "@/types/database";

function pickBestPartidoForMatchNumber<T extends PartidoMatchKeyFields>(
  current: T | undefined,
  candidate: T,
): T {
  if (!current) return candidate;
  return scoreKnockoutPartidoForIndex(candidate) >
    scoreKnockoutPartidoForIndex(current)
    ? candidate
    : current;
}

function readRoundText(partido: Partido): string {
  const meta = partido.metadata as Record<string, unknown> | null;
  if (!meta) return "";
  const apiFootball = meta.api_football as Record<string, unknown> | undefined;
  const apifootball = meta.apifootball as Record<string, unknown> | undefined;
  return String(
    apiFootball?.round ?? apifootball?.round ?? apifootball?.league_name ?? "",
  );
}

/** Extrae número de partido FIFA (73–104) desde metadata o texto del round. */
export function extractFifaMatchNumber(partido: Partido): number | null {
  const meta = partido.metadata as Record<string, unknown> | null;
  if (meta && typeof meta.fifa_match_number === "number") {
    return meta.fifa_match_number;
  }

  const round = readRoundText(partido);
  const patterns = [
    /\bmatch\s*#?\s*(\d{2,3})\b/i,
    /\bpartido\s*#?\s*(\d{2,3})\b/i,
    /\bM\s*(\d{2,3})\b/i,
  ];
  for (const pattern of patterns) {
    const match = round.match(pattern);
    if (match) {
      const n = Number(match[1]);
      if (n >= 73 && n <= 104) return n;
    }
  }

  return null;
}

function fallbackMatchNumbers(partido: Partido): number[] {
  const dateKey = toMexicoDateKey(partido.fecha_kickoff);
  const sede = (partido.sede ?? "").toLowerCase();
  const matches: number[] = [];

  for (const entry of Object.values(KNOCKOUT_SCHEDULE_BY_MATCH)) {
    if (entry.date !== dateKey) continue;
    const stadium = entry.venue.split(",")[0]!.trim().toLowerCase();
    if (sede.includes(stadium.slice(0, 10)) || stadium.includes(sede.slice(0, 10))) {
      matches.push(entry.matchNumber);
    }
  }

  return matches;
}

export function indexKnockoutPartidosByMatchNumber(
  partidos: Partido[],
): Map<number, Partido> {
  const map = new Map<number, Partido>();

  for (const partido of partidos) {
    const fromMeta = extractFifaMatchNumber(partido);
    if (fromMeta != null) {
      map.set(fromMeta, pickBestPartidoForMatchNumber(map.get(fromMeta), partido));
    }
  }

  for (const partido of partidos) {
    if (extractFifaMatchNumber(partido) != null) continue;
    for (const matchNumber of fallbackMatchNumbers(partido)) {
      map.set(
        matchNumber,
        pickBestPartidoForMatchNumber(map.get(matchNumber), partido),
      );
    }
  }

  return map;
}

export interface ResolvedKnockoutSchedule {
  fechaKickoff: string | null;
  sede: string;
  partidoId: string | null;
  dateLabel: string;
  timeLabel: string | null;
}

export function resolveKnockoutSchedule(
  entry: KnockoutScheduleEntry,
  dbByMatch: Map<number, Partido>,
): ResolvedKnockoutSchedule {
  const db = dbByMatch.get(entry.matchNumber);
  const sede = db?.sede?.trim() || entry.venue;

  if (db?.fecha_kickoff) {
    const { fecha, hora } = formatMexicoKickoff(db.fecha_kickoff);
    return {
      fechaKickoff: db.fecha_kickoff,
      sede,
      partidoId: db.id,
      dateLabel: fecha,
      timeLabel: hora,
    };
  }

  const fallbackIso = knockoutKickoffIso(entry.matchNumber, entry.date);
  const { fecha, hora } = formatMexicoKickoff(fallbackIso);

  return {
    fechaKickoff: null,
    sede,
    partidoId: db?.id ?? null,
    dateLabel: fecha,
    timeLabel: hora,
  };
}

export function isKnockoutFeedSlot(
  slot: KnockoutFeedSlot,
): slot is Extract<KnockoutFeedSlot, { kind: "winner" | "loser" }> {
  return slot.kind === "winner" || slot.kind === "loser";
}
