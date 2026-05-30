import Image from "next/image";
import { getFlagImageUrl } from "@/lib/teams/flags";
import type { GroupStandingsSnapshot, StandingGroup } from "@/lib/standings/types";

interface GroupStandingsProps {
  snapshot: GroupStandingsSnapshot;
}

function GroupTable({ group }: { group: StandingGroup }) {
  const isWorldCupGroup = group.groupKey !== "—";

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
      <div className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-3">
        <h2 className="text-sm font-bold text-white">{group.groupLabel}</h2>
        {isWorldCupGroup && (
          <p className="mt-0.5 text-[10px] text-emerald-500/80">
            Los 2 primeros avanzan de ronda
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <th className="w-8 px-2 py-2 text-center">Pos</th>
              <th className="px-2 py-2">Equipo</th>
              <th className="w-7 px-1 py-2 text-center" title="Partidos jugados">
                PJ
              </th>
              <th className="w-7 px-1 py-2 text-center" title="Ganados">
                G
              </th>
              <th className="w-7 px-1 py-2 text-center" title="Empates">
                E
              </th>
              <th className="w-7 px-1 py-2 text-center" title="Perdidos">
                P
              </th>
              <th className="w-8 px-1 py-2 text-center" title="Diferencia de goles">
                DG
              </th>
              <th className="w-9 px-2 py-2 text-center font-extrabold text-emerald-500/90">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team) => {
              const clasifica = isWorldCupGroup && team.position <= 2;
              const dg =
                team.goalDiff > 0
                  ? `+${team.goalDiff}`
                  : String(team.goalDiff);

              return (
                <tr
                  key={team.teamId}
                  className={`border-b border-zinc-800/60 last:border-0 ${
                    clasifica
                      ? "border-l-[3px] border-l-emerald-500 bg-emerald-950/25"
                      : "border-l-[3px] border-l-transparent"
                  }`}
                >
                  <td className="px-2 py-2.5 text-center font-mono font-bold tabular-nums text-zinc-400">
                    {team.position}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Image
                        src={getFlagImageUrl(team.teamId, "w40", team.teamName)}
                        alt=""
                        width={22}
                        height={16}
                        className="h-4 w-5 shrink-0 rounded-sm object-cover ring-1 ring-zinc-700"
                      />
                      <span className="truncate font-medium text-zinc-100">
                        {team.teamName}
                      </span>
                    </div>
                  </td>
                  <td className="px-1 py-2.5 text-center tabular-nums text-zinc-400">
                    {team.played}
                  </td>
                  <td className="px-1 py-2.5 text-center tabular-nums text-zinc-300">
                    {team.wins}
                  </td>
                  <td className="px-1 py-2.5 text-center tabular-nums text-zinc-400">
                    {team.draws}
                  </td>
                  <td className="px-1 py-2.5 text-center tabular-nums text-zinc-400">
                    {team.losses}
                  </td>
                  <td
                    className={`px-1 py-2.5 text-center font-mono tabular-nums ${
                      team.goalDiff > 0
                        ? "text-emerald-400"
                        : team.goalDiff < 0
                          ? "text-red-400/90"
                          : "text-zinc-500"
                    }`}
                  >
                    {dg}
                  </td>
                  <td className="px-2 py-2.5 text-center font-mono text-sm font-black tabular-nums text-emerald-300">
                    {team.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function GroupStandings({ snapshot }: GroupStandingsProps) {
  if (snapshot.groups.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No hay datos de posiciones disponibles todavía.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {snapshot.groups.map((group) => (
        <GroupTable key={group.groupKey} group={group} />
      ))}
    </div>
  );
}
