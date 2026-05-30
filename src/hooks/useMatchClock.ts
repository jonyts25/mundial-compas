"use client";

import { useEffect, useState } from "react";
import {
  formatMatchClockDisplay,
  parseRelojFromMetadata,
} from "@/lib/partidos/match-clock";
import type { EstatusPartido } from "@/types/database";

export function useMatchClockDisplay(props: {
  estatus: EstatusPartido;
  minutoActual: number | null;
  metadata?: Record<string, unknown> | null;
  fechaKickoff?: string;
}) {
  const { estatus, minutoActual, metadata, fechaKickoff } = props;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (estatus !== "en_vivo" && estatus !== "medio_tiempo") return;
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [estatus]);

  const reloj = parseRelojFromMetadata(metadata);
  return formatMatchClockDisplay(
    estatus,
    reloj,
    minutoActual,
    fechaKickoff,
    now,
    metadata,
  );
}
