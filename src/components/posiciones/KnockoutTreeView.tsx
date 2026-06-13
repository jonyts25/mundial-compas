import Image from "next/image";
import type {
  FullKnockoutTree,
  KnockoutMatch,
  KnockoutTeamSlot,
} from "@/lib/standings/knockout-bracket-types";
import { getFlagImageUrl } from "@/lib/teams/flags";

interface KnockoutTreeViewProps {
  tree: FullKnockoutTree;
}

function MiniTeam({ slot }: { slot: KnockoutTeamSlot }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {slot.teamId ? (
        <Image
          src={getFlagImageUrl(slot.teamId, "w40", slot.teamName ?? undefined)}
          alt=""
          width={16}
          height={12}
          className="h-3 w-4 shrink-0 rounded-sm object-cover ring-1 ring-zinc-700"
        />
      ) : (
        <span className="flex h-3 w-4 shrink-0 items-center justify-center rounded-sm bg-zinc-800 text-[7px] text-zinc-600">
          ·
        </span>
      )}
      <span
        className={`truncate text-[10px] leading-tight ${
          slot.teamName
            ? "font-medium text-zinc-200"
            : slot.isProvisional
              ? "text-zinc-500"
              : "text-zinc-400"
        }`}
      >
        {slot.label}
      </span>
    </div>
  );
}

function TreeMatchNode({ match }: { match: KnockoutMatch }) {
  const { schedule } = match;

  return (
    <div className="relative rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-2 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-600">
          P{match.matchNumber}
        </span>
        <span className="truncate text-[8px] text-zinc-600">
          {schedule.dateLabel.split(",")[0]}
        </span>
      </div>
      <div className="space-y-1 border-b border-zinc-800/80 pb-1.5">
        <MiniTeam slot={match.home} />
        <MiniTeam slot={match.away} />
      </div>
      <p className="mt-1.5 truncate text-[8px] text-zinc-600">
        {schedule.sede.split(",")[0]}
      </p>
    </div>
  );
}

export function KnockoutTreeView({ tree }: KnockoutTreeViewProps) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-zinc-500">
        Vista provisional del camino a la final. Desliza horizontalmente para
        ver cada ronda. Los cruces posteriores a ronda de 32 muestran ganadores
        conforme se definan resultados.
      </p>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-stretch gap-3">
          {tree.phases.map((phase, phaseIndex) => (
            <div
              key={phase.id}
              className="flex w-[148px] shrink-0 flex-col"
            >
              <div className="mb-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/90">
                  {phase.label}
                </p>
                <p className="text-[9px] text-zinc-600">
                  {phase.matches.length} partido
                  {phase.matches.length === 1 ? "" : "s"}
                </p>
              </div>

              <div
                className="flex flex-1 flex-col justify-around gap-2"
                style={{
                  minHeight:
                    phase.id === "r32"
                      ? "720px"
                      : phase.id === "r16"
                        ? "360px"
                        : phase.id === "qf"
                          ? "180px"
                          : phase.id === "sf"
                            ? "90px"
                            : "48px",
                }}
              >
                {phase.matches.map((match) => (
                  <div key={match.matchNumber} className="relative">
                    {phaseIndex < tree.phases.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute -right-3 top-1/2 hidden h-px w-3 bg-zinc-700 sm:block"
                      />
                    )}
                    <TreeMatchNode match={match} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {tree.isProvisional && (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-[10px] text-amber-400/90">
          Cuadro provisional — equipos y emparejamientos de 3.º pueden cambiar
          hasta cerrar la fase de grupos.
        </p>
      )}
    </div>
  );
}
