import { getPilotConfig } from "@/lib/api-football/pilot-config";
import { createServerDataClient } from "@/lib/supabase/server-data";

export interface PilotUiState {
  showBanner: boolean;
  label: string;
  partidosPilotCount: number;
  pilotPartidoIds: string[];
}

export async function fetchPilotUiState(): Promise<PilotUiState> {
  const pilot = getPilotConfig();
  const empty: PilotUiState = {
    showBanner: pilot.enabled,
    label: pilot.label,
    partidosPilotCount: 0,
    pilotPartidoIds: [],
  };

  if (!pilot.enabled) {
    return { ...empty, showBanner: false };
  }

  const supabase = createServerDataClient();
  const { data, error } = await supabase
    .from("partidos")
    .select("id, metadata")
    .filter("metadata->>competencia", "eq", "pilot");

  if (error) {
    console.warn("[pilot] no se pudo contar partidos de prueba:", error.message);
    return empty;
  }

  const pilotPartidoIds = (data ?? []).map((r) => r.id as string);

  return {
    showBanner: true,
    label: pilot.label,
    partidosPilotCount: pilotPartidoIds.length,
    pilotPartidoIds,
  };
}
