"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { formatMexicoKickoff } from "@/lib/datetime/mexico";
import { quinielaRoundTitle } from "@/lib/quiniela/knockout-rounds";
import type { NextPendingPredictionItem } from "@/lib/quiniela/next-pending-prediction";

interface NextPendingPredictionCardProps {
  item: NextPendingPredictionItem | null;
}

function metaLine(item: NextPendingPredictionItem): string {
  const parts: string[] = [quinielaRoundTitle(item.fase)];
  if (item.grupo) parts.push(`Grupo ${item.grupo}`);
  if (item.jornada != null) parts.push(`J${item.jornada}`);
  const { fecha, hora } = formatMexicoKickoff(item.fechaKickoff);
  parts.push(`${fecha} · ${hora} CDMX`);
  return parts.join(" · ");
}

export function NextPendingPredictionCard({ item }: NextPendingPredictionCardProps) {
  const shownTracked = useRef(false);

  useEffect(() => {
    if (!item || shownTracked.current) return;
    shownTracked.current = true;
    trackEvent("next_pending_prediction_shown", { partido_id: item.partidoId });
  }, [item]);

  if (!item) {
    return (
      <section
        className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/15 px-4 py-4"
        aria-label="Estado de pronósticos"
      >
        <h2 className="text-sm font-bold text-emerald-200">Tu siguiente pronóstico pendiente</h2>
        <p className="mt-2 text-base font-semibold text-zinc-100">Vas al día</p>
        <p className="mt-1 text-sm text-zinc-400">
          Ya no tienes pronósticos pendientes por ahora.
        </p>
      </section>
    );
  }

  const partidoId = item.partidoId;

  function handleCtaClick() {
    trackEvent("next_pending_prediction_clicked", { partido_id: partidoId });
  }

  return (
    <section
      className="mb-4 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/25 to-zinc-900/50 px-4 py-4 shadow-sm"
      aria-label="Tu siguiente pronóstico pendiente"
    >
      <h2 className="text-sm font-bold text-amber-200">Tu siguiente pronóstico pendiente</h2>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {metaLine(item)}
      </p>

      <p className="mt-3 text-center text-base font-bold leading-snug text-zinc-50">
        {item.equipoLocalNombre}
        <span className="mx-2 font-normal text-zinc-500">vs</span>
        {item.equipoVisitanteNombre}
      </p>

      <p className="mt-2 text-center text-xs font-medium text-amber-300/90">
        Aún no has pronosticado
      </p>

      <p className="mt-2 text-center text-xs leading-relaxed text-zinc-400">
        No dejes este partido al azar. Entra, revisa las señales y guarda tu marcador.
      </p>

      <Link
        href={`/partidos/${item.partidoId}`}
        onClick={handleCtaClick}
        className="mt-4 flex w-full items-center justify-center rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
      >
        Pronosticar
      </Link>
    </section>
  );
}
