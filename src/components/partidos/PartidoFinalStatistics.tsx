import {
  readPersistedMatchStatistics,
  type PersistedMatchStatistics,
} from "@/lib/api-football/match-statistics";
import {
  formatStatNumber,
  showExpectedGoalsRow,
} from "@/lib/partidos/final-statistics-display";

interface PartidoFinalStatisticsProps {
  homeName: string;
  awayName: string;
  metadata: unknown;
}

function StatRow({
  label,
  home,
  away,
}: {
  label: string;
  home: string;
  away: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
      <span className="text-right font-semibold tabular-nums text-zinc-200">
        {home}
      </span>
      <span className="text-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-left font-semibold tabular-nums text-zinc-200">
        {away}
      </span>
    </div>
  );
}

function PossessionBar({ stats }: { stats: PersistedMatchStatistics }) {
  const home = stats.possession_home_pct ?? 0;
  const away = stats.possession_away_pct ?? 0;
  const total = home + away;
  const homePct = total > 0 ? Math.round((home / total) * 100) : 50;
  const awayPct = 100 - homePct;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-medium text-zinc-400">
        <span>{homePct}%</span>
        <span className="uppercase tracking-wide">Posesión</span>
        <span>{awayPct}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="bg-emerald-600/90 transition-all"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-zinc-600/90 transition-all"
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  );
}

export function PartidoFinalStatistics({
  homeName,
  awayName,
  metadata,
}: PartidoFinalStatisticsProps) {
  const stats = readPersistedMatchStatistics(metadata);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <h2 className="text-sm font-bold text-white">Estadísticas finales</h2>
      <p className="mt-0.5 text-[10px] text-zinc-500">
        {homeName} · {awayName}
      </p>

      {!stats ? (
        <p className="mt-4 text-sm text-zinc-500">Estadísticas no disponibles</p>
      ) : (
        <div className="mt-4 space-y-4">
          {(stats.possession_home_pct != null ||
            stats.possession_away_pct != null) && (
            <PossessionBar stats={stats} />
          )}

          <div className="space-y-2.5">
            <StatRow
              label="Tiros"
              home={formatStatNumber(stats.shots_total_home)}
              away={formatStatNumber(stats.shots_total_away)}
            />
            <StatRow
              label="A puerta"
              home={formatStatNumber(stats.shots_on_home)}
              away={formatStatNumber(stats.shots_on_away)}
            />
            <StatRow
              label="Corners"
              home={formatStatNumber(stats.corners_home)}
              away={formatStatNumber(stats.corners_away)}
            />
            <StatRow
              label="Faltas"
              home={formatStatNumber(stats.fouls_home)}
              away={formatStatNumber(stats.fouls_away)}
            />
            <StatRow
              label="Offsides"
              home={formatStatNumber(stats.offsides_home)}
              away={formatStatNumber(stats.offsides_away)}
            />
            {showExpectedGoalsRow(stats) && (
              <StatRow
                label="xG"
                home={formatStatNumber(stats.xg_home)}
                away={formatStatNumber(stats.xg_away)}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
