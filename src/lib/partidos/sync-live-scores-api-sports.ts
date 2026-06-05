import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureItemToWebhookPayload } from "@/lib/api-football/fixture-to-payload";
import {
  fetchApiSportsFixtureEvents,
  findLatestGoalForScore,
} from "@/lib/api-football/fetch-events";
import { handleGoalEvent } from "@/lib/api-football/handlers/on-goal";
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
import { getPilotConfig } from "@/lib/apifootball/pilot-config";
import { getApiSportsEnv } from "@/lib/env";
import type { SyncLiveResult } from "@/lib/partidos/sync-live-scores";
import { fetchApiSportsLiveFixtures } from "@/lib/api-football/fetch-fixtures";

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
    phasesNotified: 0,
    errors: [],
  };

  const liveFilter = pilot.enabled
    ? "all"
    : String(getApiSportsEnv().worldCupLeagueId);

  const liveItems = await fetchApiSportsLiveFixtures(apiKey, timezone, liveFilter);
  result.fetched = liveItems.length;

  for (const item of liveItems) {
    try {
      const fixtureId = item.fixture.id;
      const row = mapFixtureToPartidoRow(item, {
        pilot: pilot.enabled ? { label: pilot.label } : undefined,
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
        continue;
      }
      if (!existing) continue;

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
        continue;
      }

      result.updated += 1;
      if (row.estatus === "en_vivo" || row.estatus === "medio_tiempo") {
        result.live += 1;
      }

      let persistMetadata = false;

      if (
        goalDetected &&
        notifyScore &&
        row.marcador_local != null &&
        row.marcador_visitante != null &&
        (row.estatus === "en_vivo" || row.estatus === "medio_tiempo")
      ) {
        let payload = fixtureItemToWebhookPayload(item);

        try {
          const events = await fetchApiSportsFixtureEvents(apiKey, fixtureId);
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

        const goalResult = await handleGoalEvent({
          supabase,
          partidoId: existing.id,
          payload,
        });

        if (!goalResult.ok) {
          result.errors.push(goalResult.message ?? "Error procesando gol");
        } else if (goalResult.message !== "Gol ya notificado" && goalResult.message !== "Gol ya notificado (chat)") {
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
        result.phases = [
          ...(result.phases ?? []),
          ...phaseResult.notified,
        ];
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
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return result;
}
