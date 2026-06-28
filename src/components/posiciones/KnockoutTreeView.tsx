import Image from "next/image";
import Link from "next/link";
import type {
  FullKnockoutTree,
  KnockoutMatch,
  KnockoutTeamSlot,
} from "@/lib/standings/knockout-bracket-types";
import { sortMatchesByBracketRow } from "@/lib/standings/knockout-bracket-layout";
import { getFlagImageUrl } from "@/lib/teams/flags";

interface KnockoutTreeViewProps {
  tree: FullKnockoutTree;
}

function phaseMinHeight(phaseId: string): string {
  switch (phaseId) {
    case "r32":
      return "720px";
    case "r16":
      return "360px";
    case "qf":
      return "180px";
    case "sf":
      return "90px";
    default:
      return "48px";
  }
}

function matchNodeClassName(isDefined: boolean): string {
  const base =
    "relative block rounded-xl border p-2 shadow-sm transition active:scale-[0.98]";
  if (isDefined) {
    return `${base} border-emerald-800/45 bg-emerald-950/20 hover:border-emerald-700/60`;
  }
  return `${base} border-rose-900/25 bg-rose-950/10 hover:border-rose-800/35`;
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
            ? slot.isLocked
              ? "font-medium text-emerald-100/90"
              : "font-medium text-zinc-200"
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
  const partidoId = schedule.partidoId;

  const content = (
    <>
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
    </>
  );

  const className = matchNodeClassName(match.isDefined);

  if (partidoId) {
    return (
      <Link href={`/partidos/${partidoId}`} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function KnockoutTreeView({ tree }: KnockoutTreeViewProps) {
  const showLegend = !tree.groupStageComplete;

  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-zinc-500">
        {tree.groupStageComplete
          ? "Cruces definidos — ronda de 32 confirmada. Toca un partido para ver detalle, pronósticos y marcador en vivo."
          : "Cuadro en vivo según resultados de grupo. Desliza horizontalmente para ver cada ronda."}
      </p>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-stretch gap-3">
          {tree.phases.map((phase, phaseIndex) => {
            const matches = sortMatchesByBracketRow(phase.matches);

            return (
              <div
                key={phase.id}
                className="flex w-[148px] shrink-0 flex-col"
              >
                <div className="mb-2 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/90">
                    {phase.label}
                  </p>
                  <p className="text-[9px] text-zinc-600">
                    {matches.length} partido
                    {matches.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div
                  className="flex flex-1 flex-col justify-around gap-2"
                  style={{ minHeight: phaseMinHeight(phase.id) }}
                >
                  {matches.map((match) => (
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
            );
          })}
        </div>
      </div>

      {showLegend && (
        <p className="text-[10px] leading-relaxed text-zinc-500">
          <span className="text-emerald-500/90">Verde</span> — ambos equipos
          confirmados (grupo cerrado, 1.º asegurado o fase de grupos terminada
          para cruces con 3.º).{" "}
          <span className="text-rose-400/80">Rojo tenue</span> — el rival o la
          plaza aún puede cambiar.
        </p>
      )}

      {!tree.groupStageComplete && tree.isProvisional && (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-[10px] text-amber-400/90">
          Cuadro provisional — equipos y emparejamientos de 3.º pueden cambiar
          hasta cerrar la fase de grupos.
        </p>
      )}

      {tree.groupStageComplete && (
        <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-[10px] text-emerald-400/90">
          Cruces definidos — la ronda de 32 ya no depende de otros grupos.
        </p>
      )}
    </div>
  );
}
