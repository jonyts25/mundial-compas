import Image from "next/image";
import type {
  KnockoutBracket,
  KnockoutTeamSlot,
} from "@/lib/standings/knockout-bracket-types";
import { getFlagImageUrl } from "@/lib/teams/flags";

interface KnockoutBracketViewProps {
  bracket: KnockoutBracket;
}

function TeamRow({ slot }: { slot: KnockoutTeamSlot }) {
  const showFlag = Boolean(slot.teamId);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {showFlag ? (
        <Image
          src={getFlagImageUrl(slot.teamId!, "w40", slot.teamName ?? undefined)}
          alt=""
          width={24}
          height={18}
          className="h-4.5 w-6 shrink-0 rounded-sm object-cover ring-1 ring-zinc-700"
        />
      ) : (
        <div className="flex h-4.5 w-6 shrink-0 items-center justify-center rounded-sm bg-zinc-800 text-[8px] font-bold text-zinc-500 ring-1 ring-zinc-700">
          ?
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            slot.teamName ? "text-zinc-100" : "text-zinc-400"
          }`}
        >
          {slot.label}
        </p>
        {slot.groupLetter && slot.position && (
          <p className="truncate text-[10px] text-zinc-500">
            {slot.position === 1
              ? "1.º"
              : slot.position === 2
                ? "2.º"
                : "3.º"}{" "}
            · Grupo {slot.groupLetter}
            {slot.isProvisional ? " · provisional" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export function KnockoutBracketView({ bracket }: KnockoutBracketViewProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Ronda de 32 según{" "}
          <span className="text-emerald-500/90">FIFA 2026</span>: 16 cruces
          fijos + emparejamientos de 3.º según el Anexo C (495 escenarios).
          {bracket.isProvisional ? (
            <>
              {" "}
              <span className="text-amber-400/90">
                Provisional: se actualiza con cada partido de grupos.
              </span>
            </>
          ) : (
            <> Bracket definitivo de fase de grupos.</>
          )}
        </p>
        {bracket.scenarioKey && (
          <p className="mt-1.5 text-[10px] text-zinc-600">
            Escenario 3.º: grupos{" "}
            {bracket.qualifyingThirdGroups.sort().join(", ")}
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {bracket.matches.map((match) => (
          <article
            key={match.matchNumber}
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Partido {match.matchNumber}
              </span>
              <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400/90">
                Ronda de 32
              </span>
            </div>

            <div className="space-y-2 px-3 py-3">
              <TeamRow slot={match.home} />
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                  vs
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <TeamRow slot={match.away} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
