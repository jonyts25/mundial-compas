import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchApiSportsFixtureEvents } from "@/lib/api-football/fetch-events";
import {
  buildMomentosMetadata,
  mapFixtureEventsToMomentos,
  parseMomentosFromMetadata,
} from "@/lib/api-football/match-events";
import { getApiSportsEnv } from "@/lib/env";

interface PartidoConFixture {
  id: string;
  api_football_fixture_id?: number | null;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  metadata: unknown;
}

/** Carga eventos del fixture y persiste metadata.eventos_clave (p. ej. al abrir detalle). */
export async function syncPartidoEventos(
  supabase: SupabaseClient,
  partido: PartidoConFixture,
  homeTeamId?: number | null,
): Promise<{ eventos: ReturnType<typeof parseMomentosFromMetadata> }> {
  const existing = parseMomentosFromMetadata(partido.metadata);
  if (existing.length > 0) {
    return { eventos: existing };
  }

  const fixtureId = partido.api_football_fixture_id;
  if (!fixtureId) {
    return { eventos: [] };
  }

  try {
    const { apiKey } = getApiSportsEnv();
    const events = await fetchApiSportsFixtureEvents(apiKey, fixtureId);

    let resolvedHomeId = homeTeamId ?? null;
    if (resolvedHomeId == null) {
      const af = (partido.metadata as Record<string, unknown> | null)?.api_football;
      if (af && typeof af === "object") {
        const home = (af as Record<string, unknown>).home_team_id;
        if (typeof home === "number") resolvedHomeId = home;
      }
    }
    if (resolvedHomeId == null && events.length > 0) {
      resolvedHomeId = events[0]?.team.id ?? null;
    }
    if (resolvedHomeId == null) {
      return { eventos: [] };
    }

    const momentos = mapFixtureEventsToMomentos(
      events,
      resolvedHomeId,
      partido.equipo_local_nombre,
      partido.equipo_visitante_nombre,
    );

    if (momentos.length > 0) {
      await supabase
        .from("partidos")
        .update({
          metadata: buildMomentosMetadata(partido.metadata, momentos),
          updated_at: new Date().toISOString(),
        })
        .eq("id", partido.id);
    }

    return { eventos: momentos };
  } catch {
    return { eventos: [] };
  }
}
