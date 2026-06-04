import Image from "next/image";
import { getFlagImageUrl } from "@/lib/teams/flags";
import type { StandingGroup } from "@/lib/standings/types";

interface GroupStandingsTableProps {
  group: StandingGroup;
}

export function GroupStandingsTable({ group }: GroupStandingsTableProps) {
  if (group.teams.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-center text-sm text-zinc-500">
        La tabla se actualizará cuando haya resultados en este grupo.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
      <div className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-3">
        <h2 className="text-sm font-bold text-white">{group.groupLabel}</h2>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          <span className="text-emerald-500/90">Verde</span> = top 2 ·{" "}
          <span className="text-amber-500/80">Ámbar</span> = 3.º (posible mejor
          tercero)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <th className="w-8 px-2 py-2 text-center">Pos</th>
              <th className="min-w-[120px] px-2 py-2">Equipo</th>
              <th className="w-7 px-1 py-2 text-center">PJ</th>
              <th className="w-7 px-1 py-2 text-center">G</th>
              <th className="w-7 px-1 py-2 text-center">E</th>
              <th className="w-7 px-1 py-2 text-center">P</th>
              <th className="w-7 px-1 py-2 text-center">GF</th>
              <th className="w-7 px-1 py-2 text-center">GC</th>
              <th className="w-8 px-1 py-2 text-center">DG</th>
              <th className="w-9 px-2 py-2 text-center font-extrabold text-emerald-500/90">
                PTS
              </th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team) => {
              const clasificaDirecto = team.position <= 2;
              const tercero = team.position === 3;
              const dg =
                team.goalDiff > 0
                  ? `+${team.goalDiff}`
                  : String(team.goalDiff);

              return (
                <tr
                  key={team.teamId}
                  className={`border-b border-zinc-800/60 last:border-0 border-l-[3px] ${
                    clasificaDirecto
                      ? "border-l-emerald-500 bg-emerald-950/25"
                      : tercero
                        ? "border-l-amber-500/80 bg-amber-950/15"
                        : "border-l-transparent"
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
                  <td className="px-1 py-2.5 text-center tabular-nums text-zinc-400">
                    {team.goalsFor}
                  </td>
                  <td className="px-1 py-2.5 text-center tabular-nums text-zinc-400">
                    {team.goalsAgainst}
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
