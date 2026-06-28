import { isPronosticoLocked } from "@/lib/quiniela/lock";
import {
  areBothTeamsConfirmed,
  isKnockoutPartido,
  isKnockoutPronosticable,
} from "@/lib/world-cup/knockout-participant-utils";
import type { FaseMundial, Partido } from "@/types/database";

/** Orden canónico de rondas en la quiniela del Mundial. */
export const QUINIELA_FASE_ORDER: FaseMundial[] = [
  "grupos",
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_lugar",
  "final",
];

export const QUINIELA_ROUND_DISPLAY: Record<
  FaseMundial,
  { emoji: string; title: string }
> = {
  grupos: { emoji: "⚽", title: "Fase de grupos" },
  dieciseisavos: { emoji: "🏆", title: "Ronda de 32" },
  octavos: { emoji: "🏆", title: "Octavos" },
  cuartos: { emoji: "🏆", title: "Cuartos" },
  semifinal: { emoji: "🏆", title: "Semifinales" },
  tercer_lugar: { emoji: "🥉", title: "Tercer lugar" },
  final: { emoji: "🏆", title: "Final" },
};

export function quinielaRoundTitle(fase: FaseMundial): string {
  return QUINIELA_ROUND_DISPLAY[fase]?.title ?? fase;
}

export function quinielaRoundHeading(fase: FaseMundial): string {
  const { emoji, title } = QUINIELA_ROUND_DISPLAY[fase] ?? {
    emoji: "🏆",
    title: fase,
  };
  return `${emoji} ${title}`;
}

const OPEN_STATUSES = new Set(["programado", "aplazado", "en_vivo", "medio_tiempo"]);

export function isKnockoutPhaseStarted(
  partidos: Pick<Partido, "fase" | "estatus" | "fecha_kickoff">[],
  nowMs: number,
): boolean {
  return partidos.some((p) => {
    if (!isKnockoutPartido(p)) return false;
    if (p.estatus === "finalizado" || p.estatus === "en_vivo" || p.estatus === "medio_tiempo") {
      return true;
    }
    return (
      p.estatus === "programado" &&
      new Date(p.fecha_kickoff).getTime() <= nowMs
    );
  });
}

export function isGroupStageClosedForQuiniela(
  partidos: Pick<Partido, "fase" | "estatus" | "fecha_kickoff">[],
  nowMs: number,
): boolean {
  const groupMatches = partidos.filter((p) => p.fase === "grupos");
  if (groupMatches.length === 0) return true;
  return groupMatches.every(
    (p) =>
      p.estatus === "finalizado" ||
      isPronosticoLocked(p.fecha_kickoff, nowMs),
  );
}

/** Ronda con partidos abiertos o en curso; prioriza eliminatoria si ya arrancó. */
export function detectActiveQuinielaPhase(
  partidos: Pick<Partido, "fase" | "estatus" | "fecha_kickoff">[],
  nowMs: number,
): FaseMundial {
  const knockoutStarted = isKnockoutPhaseStarted(partidos, nowMs);

  for (const fase of QUINIELA_FASE_ORDER) {
    if (fase === "grupos" && knockoutStarted) continue;

    const inPhase = partidos.filter((p) => p.fase === fase);
    if (inPhase.length === 0) continue;

    const hasOpen = inPhase.some(
      (p) =>
        OPEN_STATUSES.has(p.estatus) &&
        !isPronosticoLocked(p.fecha_kickoff, nowMs),
    );
    if (hasOpen) return fase;
  }

  if (knockoutStarted) {
    for (let i = QUINIELA_FASE_ORDER.length - 1; i >= 0; i--) {
      const fase = QUINIELA_FASE_ORDER[i]!;
      if (fase === "grupos") continue;
      if (partidos.some((p) => p.fase === fase)) return fase;
    }
  }

  return "grupos";
}

export function orderQuinielaPhases(
  phases: FaseMundial[],
  activePhase: FaseMundial,
): FaseMundial[] {
  const unique = QUINIELA_FASE_ORDER.filter((f) => phases.includes(f));
  const activeIdx = unique.indexOf(activePhase);
  if (activeIdx <= 0) return unique;

  return [...unique.slice(activeIdx), ...unique.slice(0, activeIdx)];
}

export interface QuinielaRoundProgress {
  saved: number;
  total: number;
}

export function computeQuinielaRoundProgress(
  partidos: Partido[],
  pronosticosPorPartido: Record<string, boolean>,
): QuinielaRoundProgress {
  const pronosticable = partidos.filter((p) => isKnockoutPronosticable(p));
  let saved = 0;
  for (const p of pronosticable) {
    if (pronosticosPorPartido[p.id]) saved += 1;
  }
  return { saved, total: pronosticable.length };
}

export type QuinielaRoundVisibility = "open" | "awaiting_teams" | "empty";

export function getQuinielaRoundVisibility(
  partidos: Partido[],
  filteredPartidos: Partido[],
): QuinielaRoundVisibility {
  if (filteredPartidos.length > 0) return "open";
  if (partidos.length === 0) return "empty";

  const allKnockoutTbd = partidos.every(
    (p) => isKnockoutPartido(p) && !areBothTeamsConfirmed(p),
  );
  if (allKnockoutTbd) return "awaiting_teams";

  return "empty";
}

export interface QuinielaRoundGroup {
  fase: FaseMundial;
  heading: string;
  allPartidos: Partido[];
  visiblePartidos: Partido[];
  progress: QuinielaRoundProgress;
  visibility: QuinielaRoundVisibility;
}

export function groupPartidosByQuinielaRound(input: {
  partidos: Partido[];
  filteredPartidos: Partido[];
  pronosticosPorPartido: Record<string, boolean>;
  nowMs: number;
}): QuinielaRoundGroup[] {
  const { partidos, filteredPartidos, pronosticosPorPartido, nowMs } = input;
  const activePhase = detectActiveQuinielaPhase(partidos, nowMs);

  const allByFase = new Map<FaseMundial, Partido[]>();
  for (const p of partidos) {
    const list = allByFase.get(p.fase) ?? [];
    list.push(p);
    allByFase.set(p.fase, list);
  }

  const filteredByFase = new Map<FaseMundial, Partido[]>();
  for (const p of filteredPartidos) {
    const list = filteredByFase.get(p.fase) ?? [];
    list.push(p);
    filteredByFase.set(p.fase, list);
  }

  const phases = orderQuinielaPhases([...allByFase.keys()], activePhase);

  return phases.map((fase) => {
    const allInRound = allByFase.get(fase) ?? [];
    const visibleInRound = filteredByFase.get(fase) ?? [];
    return {
      fase,
      heading: quinielaRoundHeading(fase),
      allPartidos: allInRound,
      visiblePartidos: visibleInRound,
      progress: computeQuinielaRoundProgress(
        allInRound,
        pronosticosPorPartido,
      ),
      visibility: getQuinielaRoundVisibility(allInRound, visibleInRound),
    };
  });
}
