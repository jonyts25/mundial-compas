import type { MatchSummaryInput } from "@/lib/ai/match-summary/match-summary-types";

const TIMELINE_LABELS: Record<string, string> = {
  gol: "Gol",
  penalty_goal: "Gol de penal",
  own_goal: "Autogol",
  tarjeta_roja: "Roja",
  penal_fallado: "Penal fallado",
  var: "VAR",
  gol_anulado: "Gol anulado",
};

function formatMinute(minute: number | null, extra: number | null): string {
  if (minute == null) return "—";
  if (extra != null && extra > 0) return `${minute}+${extra}'`;
  return `${minute}'`;
}

interface MatchSummaryInputFactsProps {
  input: MatchSummaryInput;
  compact?: boolean;
}

/** Datos verificables del partido (sin narrativa IA). */
export function MatchSummaryInputFacts({
  input,
  compact = false,
}: MatchSummaryInputFactsProps) {
  const { match, statistics, timeline } = input;
  const scoreLabel = `${match.home_name} ${match.score_home}–${match.score_away} ${match.away_name}`;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Marcador final
        </p>
        <p className="mt-1 text-sm font-semibold text-zinc-200">{scoreLabel}</p>
      </div>

      {statistics ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Estadísticas
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-zinc-400">
            {statistics.possession_home_pct != null &&
            statistics.possession_away_pct != null ? (
              <li>
                Posesión: {statistics.possession_home_pct}% –{" "}
                {statistics.possession_away_pct}%
              </li>
            ) : null}
            {statistics.shots_on_home != null &&
            statistics.shots_on_away != null ? (
              <li>
                Tiros a puerta: {statistics.shots_on_home} –{" "}
                {statistics.shots_on_away}
              </li>
            ) : null}
            {statistics.corners_home != null &&
            statistics.corners_away != null ? (
              <li>
                Córners: {statistics.corners_home} – {statistics.corners_away}
              </li>
            ) : null}
            {statistics.xg_home != null && statistics.xg_away != null ? (
              <li>
                xG: {statistics.xg_home} – {statistics.xg_away}
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Estadísticas no disponibles.</p>
      )}

      {timeline.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Cronología
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-zinc-400">
            {timeline.map((ev, i) => (
              <li key={`${ev.minute}-${ev.player}-${i}`}>
                <span className="font-mono text-zinc-500">
                  {formatMinute(ev.minute, ev.extra)}
                </span>{" "}
                {ev.event_text ??
                  `${TIMELINE_LABELS[ev.type] ?? ev.type}: ${ev.player} (${ev.team_code})`}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Cronología vacía.</p>
      )}

      {input.quiniela_impact && input.quiniela_impact.picks_total > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Quiniela
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {input.quiniela_impact.picks_total} pronósticos
            {input.quiniela_impact.most_common_score
              ? ` · marcador más común ${input.quiniela_impact.most_common_score}`
              : ""}
            {input.quiniela_impact.most_common_score_pct != null
              ? ` (${input.quiniela_impact.most_common_score_pct}%)`
              : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
