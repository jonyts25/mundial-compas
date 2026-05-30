import type { SupabaseClient } from "@supabase/supabase-js";
import { getApiFootballEnv } from "@/lib/env";
import { fetchLineupsFromApi } from "@/lib/apifootball/fetch-lineups";
import { queuePartidoPushNotifications } from "@/lib/apifootball/webhook/notifications";
import {
  readLineupsFromMetadata,
  type PartidoLineups,
} from "@/lib/partidos/lineups-types";

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

  let apiKey: string;
  try {
    apiKey = getApiFootballEnv().apiKey;
  } catch {
    return {
      available: Boolean(cached),
      lineups: cached,
      fromCache: true,
      skipped: "sin_api_key",
    };
  }

  const fresh = await fetchLineupsFromApi(apiKey, fixtureId);
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
    const local = partido.equipo_local_nombre;
    const visitante = partido.equipo_visitante_nombre;
    await queuePartidoPushNotifications(
      supabase,
      partido.id,
      "alineaciones",
      `📋 Alineaciones: ${local} vs ${visitante}`,
      "Ya puedes ver titulares y banca en la app.",
      { fuente: "get_lineups" },
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
