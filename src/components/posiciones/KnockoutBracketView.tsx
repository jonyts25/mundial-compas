"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { KnockoutTreeView } from "@/components/posiciones/KnockoutTreeView";
import type {
  FullKnockoutTree,
  KnockoutBracket,
  KnockoutMatch,
  KnockoutTeamSlot,
} from "@/lib/standings/knockout-bracket-types";
import { KNOCKOUT_PHASE_LABELS } from "@/lib/standings/world-cup-knockout-schedule";
import { getFlagImageUrl } from "@/lib/teams/flags";

type KnockoutSubView = "partidos" | "cuadro";

interface KnockoutBracketViewProps {
  bracket: KnockoutBracket;
  fullTree: FullKnockoutTree;
}

function MatchScheduleMeta({ match }: { match: KnockoutMatch }) {
  const { schedule } = match;
  const timeText = schedule.timeLabel
    ? `${schedule.timeLabel} CDMX`
    : "Hora por confirmar";

  return (
    <div className="border-b border-zinc-800/80 bg-zinc-950/50 px-3 py-2">
      <p className="text-[11px] font-medium text-zinc-300">
        {schedule.dateLabel} · {timeText}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-zinc-500">
        📍 {schedule.sede}
      </p>
    </div>
  );
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

function MatchCard({ match }: { match: KnockoutMatch }) {
  const phaseLabel = KNOCKOUT_PHASE_LABELS[match.phase];
  const content = (
    <>
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Partido {match.matchNumber}
        </span>
        <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400/90">
          {phaseLabel}
        </span>
      </div>

      <MatchScheduleMeta match={match} />

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
    </>
  );

  if (match.schedule.partidoId) {
    return (
      <Link
        href={`/partidos/${match.schedule.partidoId}`}
        className="block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg transition hover:border-zinc-600 active:scale-[0.99]"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
      {content}
    </article>
  );
}

export function KnockoutBracketView({
  bracket,
  fullTree,
}: KnockoutBracketViewProps) {
  const [subView, setSubView] = useState<KnockoutSubView>("partidos");

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Eliminatorias según{" "}
          <span className="text-emerald-500/90">FIFA 2026</span>: ronda de 32
          con Anexo C + cuadro completo hasta la final.
          {bracket.isProvisional ? (
            <>
              {" "}
              <span className="text-amber-400/90">
                Provisional: se actualiza con cada partido.
              </span>
            </>
          ) : (
            <> Clasificación de grupos cerrada.</>
          )}
        </p>
        {bracket.scenarioKey && (
          <p className="mt-1.5 text-[10px] text-zinc-600">
            Escenario 3.º: grupos{" "}
            {bracket.qualifyingThirdGroups.sort().join(", ")}
          </p>
        )}
      </section>

      <div className="flex rounded-lg border border-zinc-800 bg-zinc-950/60 p-0.5">
        <button
          type="button"
          onClick={() => setSubView("partidos")}
          className={`flex-1 rounded-md px-3 py-2 text-[11px] font-bold transition ${
            subView === "partidos"
              ? "bg-zinc-800 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Partidos
        </button>
        <button
          type="button"
          onClick={() => setSubView("cuadro")}
          className={`flex-1 rounded-md px-3 py-2 text-[11px] font-bold transition ${
            subView === "cuadro"
              ? "bg-zinc-800 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Cuadro general
        </button>
      </div>

      {subView === "cuadro" ? (
        <KnockoutTreeView tree={fullTree} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bracket.matches.map((match) => (
            <MatchCard key={match.matchNumber} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
