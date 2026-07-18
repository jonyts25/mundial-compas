"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { EstatusPartido } from "@/types/database";

/** Refresca la pantalla del partido mientras debería estar en juego. */
export function PartidoLiveRefresh({
  partidoId,
  estatus,
  fechaKickoff,
}: {
  partidoId: string;
  estatus: EstatusPartido;
  fechaKickoff: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const enJuego = estatus === "en_vivo" || estatus === "medio_tiempo";
    const kickoffMs = new Date(fechaKickoff).getTime();
    const shouldPoll =
      enJuego ||
      (estatus === "programado" && Date.now() >= kickoffMs - 5 * 60_000);

    if (!shouldPoll) return;

    const id = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [estatus, fechaKickoff, partidoId, router]);

  return null;
}
