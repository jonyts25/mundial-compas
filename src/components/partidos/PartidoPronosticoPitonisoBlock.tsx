"use client";

import { useState } from "react";
import { PitonisoCard } from "@/components/partidos/PitonisoCard";
import {
  TuPronosticoCard,
} from "@/components/partidos/TuPronosticoCard";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import type { PitonisoStaticContext } from "@/lib/partidos/pitoniso-signals";
import type { Partido, PronosticoPartido } from "@/types/database";

interface PartidoPronosticoPitonisoBlockProps {
  partido: Partido;
  pronostico: PronosticoPartido | null;
  pitonisoContext: PitonisoStaticContext | null;
  ligaId?: string;
}

export function PartidoPronosticoPitonisoBlock({
  partido,
  pronostico,
  pitonisoContext,
  ligaId = LIGA_GLOBAL_ID,
}: PartidoPronosticoPitonisoBlockProps) {
  const [aggregatesRefreshKey, setAggregatesRefreshKey] = useState(0);

  function handlePronosticoSaved() {
    setAggregatesRefreshKey((k) => k + 1);
  }

  return (
    <>
      <TuPronosticoCard
        partido={partido}
        pronostico={pronostico}
        ligaId={ligaId}
        onPronosticoSaved={handlePronosticoSaved}
      />
      {pitonisoContext ? (
        <PitonisoCard
          staticContext={pitonisoContext}
          ligaId={ligaId}
          aggregatesRefreshKey={aggregatesRefreshKey}
        />
      ) : null}
    </>
  );
}
