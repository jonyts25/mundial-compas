import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLineupsFromApiSports } from "@/lib/api-football/fetch-lineups";
import { queuePartidoPushNotifications } from "@/lib/api-football/push/notifications";
import { getApiSportsEnv } from "@/lib/env";
import {
  readLineupsFromMetadata,
  type PartidoLineups,
} from "@/lib/partidos/lineups-types";
import { displayTeamPair } from "@/lib/teams/display-names";

const SYNC_WINDOW_MS = 4 * 60 * 60 * 1000;
const MIN_RETRY_MS = 15 * 60 * 1000;

type PartidoRow = {
  id: string;
  api_football_fixture_id: number | null;
  fecha_kickoff: string;
  estatus: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  metadata: Record<string, unknown> | null;
};

function isWithinLineupWindow(kickoffIso: string): boolean {
  const kickoff = new Date(kickoffIso).getTime();
  const now = Date.now();
  return now >= kickoff - SYNC_WINDOW_MS && now <= kickoff + 30 * 60 * 1000;
}

function shouldFetchAgain(existing: PartidoLineups | null): boolean {
  if (!existing) return true;
  const age = Date.now() - new Date(existing.fetchedAt).getTime();
  return age >= MIN_RETRY_MS;
}

async function fetchLineupsForFixture(
  fixtureId: number,
): Promise<PartidoLineups | null> {
  try {
    const { apiKey } = getApiSportsEnv();
    return await fetchLineupsFromApiSports(apiKey, fixtureId);
  } catch {
    return null;
  }
}

export type SyncLineupsResult = {
  available: boolean;
  lineups: PartidoLineups | null;
  fromCache: boolean;
  skipped?: string;
};

export async function syncPartidoLineups(
  supabase: SupabaseClient,
  partido: PartidoRow,
  options: { force?: boolean } = {},
): Promise<SyncLineupsResult> {
  const cached = readLineupsFromMetadata(partido.metadata);

  if (cached && !options.force) {
    return { available: true, lineups: cached, fromCache: true };
  }

  if (!options.force && partido.estatus === "finalizado") {
    return {
      available: Boolean(cached),
      lineups: cached,
      fromCache: true,
      skipped: "partido_finalizado",
    };
  }

  if (!options.force && !isWithinLineupWindow(partido.fecha_kickoff)) {
    return {
      available: Boolean(cached),
      lineups: cached,
      fromCache: true,
      skipped: "fuera_ventana",
    };
  }

  if (!options.force && cached && !shouldFetchAgain(cached)) {
    return { available: true, lineups: cached, fromCache: true };
  }

  const fixtureId = partido.api_football_fixture_id;
  if (!fixtureId) {
    return {
      available: false,
      lineups: cached,
      fromCache: true,
      skipped: "sin_fixture_id",
    };
  }

  const fresh = await fetchLineupsForFixture(fixtureId);
  if (!fresh) {
    if (cached) {
      return { available: true, lineups: cached, fromCache: true };
    }
    return { available: false, lineups: null, fromCache: false };
  }

  const wasAvailable = Boolean(cached);
  const lineups: PartidoLineups = {
    ...fresh,
    notifiedAt: cached?.notifiedAt ?? null,
  };

  const metadata = {
    ...(partido.metadata ?? {}),
    alineaciones: lineups,
  };

  await supabase
    .from("partidos")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", partido.id);

  if (!wasAvailable && !lineups.notifiedAt) {
    const teams = displayTeamPair(
      partido.equipo_local_nombre,
      partido.equipo_visitante_nombre,
    );
    const eventKey = `alineaciones-${fixtureId}`;
    await queuePartidoPushNotifications(
      supabase,
      partido.id,
      "alineaciones",
      `📋 Alineaciones: ${teams.local} vs ${teams.visitante}`,
      "Ya puedes ver titulares y banca en la app.",
      { event_key: eventKey, fuente: "fixtures/lineups" },
    );

    lineups.notifiedAt = new Date().toISOString();
    await supabase
      .from("partidos")
      .update({
        metadata: { ...metadata, alineaciones: lineups },
        updated_at: new Date().toISOString(),
      })
      .eq("id", partido.id);
  }

  return { available: true, lineups, fromCache: false };
}
