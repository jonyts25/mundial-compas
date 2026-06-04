import Image from "next/image";
import { BEST_THIRD_PLACES_QUALIFY_COUNT } from "@/lib/standings/world-cup-groups";
import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import { getFlagImageUrl } from "@/lib/teams/flags";

interface BestThirdPlacesTableProps {
  rows: BestThirdPlaceRow[];
}

export function BestThirdPlacesTable({ rows }: BestThirdPlacesTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-center text-sm text-zinc-500">
        Cuando haya tablas de grupo con 3.º lugar, verás aquí el ranking de
        mejores terceros.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-3">
        <h2 className="text-sm font-bold text-white">Mejores terceros</h2>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          Clasifican los {BEST_THIRD_PLACES_QUALIFY_COUNT} mejores 3.º de grupo
          (de 12) a dieciseisavos · criterios FIFA
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <th className="w-8 px-2 py-2 text-center">#</th>
              <th className="w-10 px-1 py-2 text-center">Grp</th>
              <th className="px-2 py-2">Equipo</th>
              <th className="w-7 px-1 py-2 text-center">PJ</th>
              <th className="w-8 px-1 py-2 text-center">DG</th>
              <th className="w-9 px-2 py-2 text-center">PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const dg =
                row.goalDiff > 0 ? `+${row.goalDiff}` : String(row.goalDiff);

              return (
                <tr
                  key={`${row.groupKey}-${row.teamId}`}
                  className={`border-b border-zinc-800/60 last:border-0 border-l-[3px] ${
                    row.qualifies
                      ? "border-l-emerald-500 bg-emerald-950/25"
                      : "border-l-transparent opacity-80"
                  }`}
                >
                  <td className="px-2 py-2.5 text-center font-mono font-bold text-zinc-400">
                    {row.rank}
                  </td>
                  <td className="px-1 py-2.5 text-center font-bold text-zinc-500">
                    {row.groupKey}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <Image
                        src={getFlagImageUrl(row.teamId, "w40", row.teamName)}
                        alt=""
                        width={20}
                        height={14}
                        className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
                      />
                      <span className="truncate font-medium text-zinc-100">
                        {row.teamName}
                      </span>
                      {row.qualifies && (
                        <span className="shrink-0 text-[9px] font-bold uppercase text-emerald-400">
                          ✓ R32
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-2.5 text-center tabular-nums text-zinc-400">
                    {row.played}
                  </td>
                  <td className="px-1 py-2.5 text-center font-mono tabular-nums text-zinc-400">
                    {dg}
                  </td>
                  <td className="px-2 py-2.5 text-center font-mono font-black tabular-nums text-emerald-300">
                    {row.points}
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
