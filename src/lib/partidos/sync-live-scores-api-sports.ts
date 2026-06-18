import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureItemToWebhookPayload } from "@/lib/api-football/fixture-to-payload";
import {
  fetchApiSportsFixtureEvents,
  findLatestGoalForScore,
} from "@/lib/api-football/fetch-events";
import {
  fetchApiSportsFixturesByIds,
  fetchApiSportsLiveFixtures,
} from "@/lib/api-football/fetch-fixtures";
import { handleGoalEvent } from "@/lib/api-football/handlers/on-goal";
import { handleRedCardEvent } from "@/lib/api-football/handlers/on-red-card";
import {
  mergeAnnouncedPhases,
  notifyPhaseTransitions,
} from "@/lib/api-football/handlers/phase-sync";
import { buildRelojFromApiSportsFixture } from "@/lib/api-football/match-clock";
import {
  baselineGolNotifyScore,
  buildGolNotifyMetadata,
  getGolNotifyScore,
  isGoalAlreadyNotified,
  scoreIncreased,
} from "@/lib/api-football/goal-notify-state";
import { mapFixtureToPartidoRow } from "@/lib/api-football/map-fixture-row";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import {
  buildMomentosMetadata,
  mapFixtureEventsToMomentos,
} from "@/lib/api-football/match-events";
import {
  baselineNotifiedRedCards,
  buildRedCardNotifyMetadata,
  findNewRedCards,
} from "@/lib/api-football/red-card-notify-state";
import { getPilotConfig } from "@/lib/api-football/pilot-config";
import { getApiSportsEnv } from "@/lib/env";
import type { SyncLiveResult } from "@/lib/partidos/sync-live-scores";

async function syncOneApiSportsFixture(
  supabase: SupabaseClient,
  item: ApiFootballFixtureItem,
  apiKey: string,
  pilotEnabled: boolean,
  pilotLabel: string,
  result: SyncLiveResult,
): Promise<void> {
  const fixtureId = item.fixture.id;
  const row = mapFixtureToPartidoRow(item, {
    pilot: pilotEnabled ? { label: pilotLabel } : undefined,
  });

  const { data: existing, error: findError } = await supabase
    .from("partidos")
    .select(
      "id, estatus, fase, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante, metadata",
    )
    .eq("api_football_fixture_id", fixtureId)
    .maybeSingle();

  if (findError) {
    result.errors.push(findError.message);
    return;
  }
  if (!existing) return;

  let notifyScore = getGolNotifyScore(existing.metadata);
  const baseline = baselineGolNotifyScore(existing.metadata, {
    local: row.marcador_local,
    away: row.marcador_visitante,
  });
  if (baseline) notifyScore = baseline;

  const goalDetected =
    row.marcador_local != null &&
    row.marcador_visitante != null &&
    !isGoalAlreadyNotified(existing.metadata, row.marcador_local, row.marcador_visitante) &&
    notifyScore != null &&
    scoreIncreased(notifyScore, row.marcador_local, row.marcador_visitante);

  const { reloj, minuto_actual: minutoReloj } = buildRelojFromApiSportsFixture(
    item,
    existing.metadata,
  );

  const metadata: Record<string, unknown> = {
    ...(typeof existing.metadata === "object" && existing.metadata !== null
      ? (existing.metadata as Record<string, unknown>)
      : {}),
    reloj,
    api_football: {
      ...((existing.metadata as Record<string, unknown>)?.api_football as object),
      provider: "api-sports",
      status_short: item.fixture.status.short,
      status_long: item.fixture.status.long,
      last_live_sync: new Date().toISOString(),
    },
  };

  if (baseline) {
    metadata.gol_notify_score = baseline;
  }

  const { error: updateError } = await supabase
    .from("partidos")
    .update({
      estatus: row.estatus,
      marcador_local: row.marcador_local,
      marcador_visitante: row.marcador_visitante,
      minuto_actual: minutoReloj ?? row.minuto_actual,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    result.errors.push(updateError.message);
    return;
  }

  result.updated += 1;
  if (row.estatus === "en_vivo" || row.estatus === "medio_tiempo") {
    result.live += 1;
  }

  let persistMetadata = false;

  const shouldSyncEvents =
    row.estatus === "en_vivo" ||
    row.estatus === "medio_tiempo" ||
    row.estatus === "finalizado" ||
    goalDetected;

  let fetchedEvents: Awaited<ReturnType<typeof fetchApiSportsFixtureEvents>> | null =
    null;

  if (shouldSyncEvents) {
    try {
      fetchedEvents = await fetchApiSportsFixtureEvents(apiKey, fixtureId);
      result.apiRequests = (result.apiRequests ?? 0) + 1;

      const momentos = mapFixtureEventsToMomentos(
        fetchedEvents,
        item.teams.home.id,
        String(existing.equipo_local_nombre ?? item.teams.home.name),
        String(existing.equipo_visitante_nombre ?? item.teams.away.name),
      );
      Object.assign(metadata, buildMomentosMetadata(metadata, momentos));
      persistMetadata = true;

      const baselineRojas = baselineNotifiedRedCards(existing.metadata, momentos);
      if (baselineRojas) {
        Object.assign(
          metadata,
          buildRedCardNotifyMetadata(metadata, baselineRojas),
        );
      } else if (row.estatus === "en_vivo" || row.estatus === "medio_tiempo") {
        let redCardMeta = existing.metadata;
        for (const roja of findNewRedCards(redCardMeta, momentos)) {
          const redResult = await handleRedCardEvent({
            supabase,
            partidoId: existing.id,
            momento: roja,
          });
          if (!redResult.ok) {
            result.errors.push(redResult.message ?? "Error procesando tarjeta roja");
          } else if (redResult.message === "Tarjeta roja procesada") {
            result.redCardsNotified = (result.redCardsNotified ?? 0) + 1;
            redCardMeta = buildRedCardNotifyMetadata(redCardMeta, [roja.id]);
            Object.assign(metadata, redCardMeta);
          }
        }
      }
    } catch (e) {
      result.errors.push(
        e instanceof Error ? e.message : "Error obteniendo eventos del partido",
      );
    }
  }

  if (
    goalDetected &&
    notifyScore &&
    row.marcador_local != null &&
    row.marcador_visitante != null &&
    (row.estatus === "en_vivo" || row.estatus === "medio_tiempo")
  ) {
    let payload = fixtureItemToWebhookPayload(item);

    if (fetchedEvents) {
      const latestGoal = findLatestGoalForScore(
        fetchedEvents,
        {
          local: row.marcador_local,
          visitante: row.marcador_visitante,
        },
        item.teams.home.id,
      );
      if (latestGoal) {
        payload = {
          ...payload,
          goal: {
            team: { name: latestGoal.team.name },
            player: latestGoal.player?.name
              ? { name: latestGoal.player.name }
              : undefined,
            time: { elapsed: latestGoal.time.elapsed ?? undefined },
            detail: latestGoal.detail ?? undefined,
          },
        };
      }
    } else {
      try {
        const events = await fetchApiSportsFixtureEvents(apiKey, fixtureId);
        result.apiRequests = (result.apiRequests ?? 0) + 1;
        const latestGoal = findLatestGoalForScore(
          events,
          {
            local: row.marcador_local,
            visitante: row.marcador_visitante,
          },
          item.teams.home.id,
        );
        if (latestGoal) {
          payload = {
            ...payload,
            goal: {
              team: { name: latestGoal.team.name },
              player: latestGoal.player?.name
                ? { name: latestGoal.player.name }
                : undefined,
              time: { elapsed: latestGoal.time.elapsed ?? undefined },
              detail: latestGoal.detail ?? undefined,
            },
          };
        }
      } catch {
        // +1 req opcional; seguimos con gol genérico
      }
    }

    const goalResult = await handleGoalEvent({
      supabase,
      partidoId: existing.id,
      payload,
    });

    if (!goalResult.ok) {
      result.errors.push(goalResult.message ?? "Error procesando gol");
    } else if (
      goalResult.message !== "Gol ya notificado" &&
      goalResult.message !== "Gol ya notificado (chat)" &&
      goalResult.message !== "Gol ya notificado (claim)"
    ) {
      result.goalsNotified += 1;
    }

    Object.assign(
      metadata,
      buildGolNotifyMetadata(metadata, row.marcador_local, row.marcador_visitante),
    );
    persistMetadata = true;
  } else if (
    row.marcador_local != null &&
    row.marcador_visitante != null &&
    !isGoalAlreadyNotified(existing.metadata, row.marcador_local, row.marcador_visitante)
  ) {
    Object.assign(
      metadata,
      buildGolNotifyMetadata(metadata, row.marcador_local, row.marcador_visitante),
    );
    persistMetadata = true;
  }

  const roundHint =
    typeof metadata.api_football === "object" &&
    metadata.api_football !== null &&
    typeof (metadata.api_football as Record<string, unknown>).round === "string"
      ? ((metadata.api_football as Record<string, unknown>).round as string)
      : null;

  const phaseResult = await notifyPhaseTransitions({
    supabase,
    partidoId: existing.id,
    local: String(existing.equipo_local_nombre ?? item.teams.home.name),
    visitante: String(existing.equipo_visitante_nombre ?? item.teams.away.name),
    fase: existing.fase ?? "grupos",
    estatus: row.estatus,
    roundHint,
    homeScore: row.marcador_local ?? 0,
    awayScore: row.marcador_visitante ?? 0,
    prevMetadata: existing.metadata,
    newRelojMetadata: reloj,
    statusShort: item.fixture.status.short,
  });

  result.phasesNotified += phaseResult.notified.length;
  if (phaseResult.notified.length > 0) {
    result.phases = [...(result.phases ?? []), ...phaseResult.notified];
  }
  result.errors.push(...phaseResult.errors);

  if (phaseResult.notified.length > 0) {
    persistMetadata = true;
  }

  if (persistMetadata) {
    await supabase
      .from("partidos")
      .update({
        metadata: mergeAnnouncedPhases(metadata, phaseResult.announcedPhases),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  }
}

/** Partidos en BD aún "en vivo" que ya no aparecen en live=all (p. ej. FT). */
async function fetchStaleLiveFixtureIds(
  supabase: SupabaseClient,
  liveFixtureIds: Set<number>,
): Promise<number[]> {
  const { data: rows, error } = await supabase
    .from("partidos")
    .select("api_football_fixture_id")
    .in("estatus", ["en_vivo", "medio_tiempo"]);

  if (error) throw new Error(error.message);

  return (rows ?? [])
    .map((r) => r.api_football_fixture_id as number | null)
    .filter((id): id is number => id != null && !liveFixtureIds.has(id));
}

/** Partidos en vivo con kickoff antiguo — el feed live puede quedarse colgado en 2H. */
async function fetchOverdueLiveFixtureIds(
  supabase: SupabaseClient,
  maxHoursAfterKickoff = 2.5,
): Promise<number[]> {
  const cutoff = new Date(
    Date.now() - maxHoursAfterKickoff * 60 * 60 * 1000,
  ).toISOString();

  const { data: rows, error } = await supabase
    .from("partidos")
    .select("api_football_fixture_id")
    .in("estatus", ["en_vivo", "medio_tiempo"])
    .not("api_football_fixture_id", "is", null)
    .lt("fecha_kickoff", cutoff);

  if (error) throw new Error(error.message);

  return (rows ?? [])
    .map((r) => r.api_football_fixture_id as number | null)
    .filter((id): id is number => id != null);
}

async function syncFixtureIdsByLookup(
  supabase: SupabaseClient,
  fixtureIds: number[],
  apiKey: string,
  timezone: string,
  pilotEnabled: boolean,
  pilotLabel: string,
  result: SyncLiveResult,
): Promise<void> {
  if (fixtureIds.length === 0) return;

  const unique = [...new Set(fixtureIds)];
  const items = await fetchApiSportsFixturesByIds(apiKey, unique, timezone);
  result.apiRequests = (result.apiRequests ?? 0) + Math.ceil(unique.length / 20);
  result.fetched += items.length;

  for (const item of items) {
    try {
      await syncOneApiSportsFixture(
        supabase,
        item,
        apiKey,
        pilotEnabled,
        pilotLabel,
        result,
      );
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  }
}

/** Polling vía GET /fixtures?live=all (1 req por sync — adecuado al plan free). */
export async function syncLiveScoresFromApiSports(
  supabase: SupabaseClient,
): Promise<SyncLiveResult> {
  const { apiKey, timezone } = getApiSportsEnv();
  const pilot = getPilotConfig();
  const result: SyncLiveResult = {
    fetched: 0,
    updated: 0,
    live: 0,
    goalsNotified: 0,
    redCardsNotified: 0,
    phasesNotified: 0,
    errors: [],
    apiRequests: 0,
  };

  const liveItems = await fetchApiSportsLiveFixtures(apiKey, timezone, "all");
  result.apiRequests = 1;
  result.fetched = liveItems.length;

  const liveIds = new Set(liveItems.map((item) => item.fixture.id));

  for (const item of liveItems) {
    try {
      await syncOneApiSportsFixture(
        supabase,
        item,
        apiKey,
        pilot.enabled,
        pilot.label,
        result,
      );
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  try {
    const [staleIds, overdueIds] = await Promise.all([
      fetchStaleLiveFixtureIds(supabase, liveIds),
      fetchOverdueLiveFixtureIds(supabase),
    ]);
    const refetchIds = [...new Set([...staleIds, ...overdueIds])].filter(
      (id) => !liveIds.has(id),
    );

    await syncFixtureIdsByLookup(
      supabase,
      refetchIds,
      apiKey,
      timezone,
      pilot.enabled,
      pilot.label,
      result,
    );
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }

  return result;
}

