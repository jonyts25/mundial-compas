import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureItemToWebhookPayload } from "@/lib/api-football/fixture-to-payload";
import {
  fetchApiSportsFixtureEvents,
  findLatestGoalForScore,
  findNthPenaltyGoalForTeam,
} from "@/lib/api-football/fetch-events";
import {
  fetchApiSportsFixtureStatistics,
} from "@/lib/api-football/fetch-statistics";
import {
  fetchApiSportsFixturesByIds,
  fetchApiSportsLiveFixtures,
} from "@/lib/api-football/fetch-fixtures";
import { handleGoalEvent } from "@/lib/api-football/handlers/on-goal";
import { handleGoalCancelledEvent } from "@/lib/api-football/handlers/on-goal-cancelled";
import { handlePenalAnotadoEvent } from "@/lib/api-football/handlers/on-penal-anotado";
import { handlePenalFalladoEvent } from "@/lib/api-football/handlers/on-penal-fallado";
import { handleRedCardEvent } from "@/lib/api-football/handlers/on-red-card";
import {
  mergeAnnouncedPhases,
  notifyPhaseTransitions,
} from "@/lib/api-football/handlers/phase-sync";
import { buildRelojFromApiSportsFixture } from "@/lib/api-football/match-clock";
import {
  baselineGolNotifyScore,
  buildGolNotifyMetadata,
  detectScoreDecreaseSide,
  getGolNotifyScore,
  isGoalAlreadyNotified,
  scoreDecreased,
  scoreIncreased,
} from "@/lib/api-football/goal-notify-state";
import {
  resetPartidoLiveNotifyState,
  shouldResetLiveNotifyState,
} from "@/lib/api-football/notify-state-reset";
import {
  buildCancelledGoalNotifyMetadata,
  cancelledGoalNotifyKey,
  isCancelledGoalAlreadyNotified,
} from "@/lib/api-football/goal-cancel-notify-state";
import { mapFixtureToPartidoRow, resolveFifaMatchNumber } from "@/lib/api-football/map-fixture-row";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import {
  buildMomentosMetadata,
  buildGolAnuladoMomento,
  findVarGoalCancelledForTeam,
  mapFixtureEventsToMomentos,
  mergeGolAnuladoMomento,
} from "@/lib/api-football/match-events";
import {
  baselineNotifiedPenalFallados,
  buildPenalFalladoNotifyMetadata,
  findNewPenalFallados,
} from "@/lib/api-football/penal-fallado-notify-state";
import {
  buildStatisticsMetadata,
  hasPersistedMatchStatistics,
  normalizeApiSportsFixtureStatistics,
} from "@/lib/api-football/match-statistics";
import {
  baselineNotifiedRedCards,
  buildRedCardNotifyMetadata,
  findNewRedCards,
} from "@/lib/api-football/red-card-notify-state";
import { getPilotConfig } from "@/lib/api-football/pilot-config";
import {
  baselinePenNotifyScore,
  buildPenNotifyMetadata,
  getPenNotifyScore,
  isPenScoreAlreadyNotified,
  penScoreIncreased,
} from "@/lib/api-football/penalty-notify-state";
import {
  extractPenaltyScoresFromFixture,
  isKnockoutPenaltyMetadataMissing,
  isPenaltyShootoutLive,
  mergePenaltyMetadata,
  penaltySideIncreased,
  readPenaltyScoresFromMetadata,
} from "@/lib/api-football/penalty-sync";
import { resolvePenaltyScores } from "@/lib/api-football/push/push-score";
import type { EstatusPartido } from "@/types/database";
import { parseRelojFromMetadata } from "@/lib/partidos/match-clock";
import { getTeamDisplayNameEs } from "@/lib/teams/display-names";
import { getApiSportsEnv } from "@/lib/env";
import { normalizeTeamNameForMatch } from "@/lib/partidos/partido-match-key";
import { shouldSyncKickoffFromApi } from "@/lib/partidos/kickoff-sync";
import {
  getLiveSyncWindowConfig,
  type LiveSyncWindowConfig,
} from "@/lib/partidos/live-sync-window";
import type { SyncLiveResult } from "@/lib/partidos/sync-live-scores";
import { PLACEHOLDER_FIXTURE_BASE, placeholderFixtureId } from "@/lib/world-cup/knockout-match-ids";
import {
  logSyncLiveComplete,
  logSyncLiveFixture,
  logSyncLiveStart,
  type SyncLiveFixtureLog,
} from "@/lib/partidos/sync-live-telemetry";

async function syncOneApiSportsFixture(
  supabase: SupabaseClient,
  item: ApiFootballFixtureItem,
  apiKey: string,
  pilotEnabled: boolean,
  pilotLabel: string,
  result: SyncLiveResult,
): Promise<void> {
  const fixtureId = item.fixture.id;
  const startedAt = Date.now();
  let partidoId: string | null = null;
  let status: string | null = null;
  let minuto: number | null = null;
  let outcome: SyncLiveFixtureLog["outcome"] = "updated";

  try {
  const row = mapFixtureToPartidoRow(item, {
    pilot: pilotEnabled ? { label: pilotLabel } : undefined,
  });

  const { data: existingRow, error: findError } = await supabase
    .from("partidos")
    .select(
      "id, estatus, fase, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante, metadata, api_football_fixture_id, fecha_kickoff",
    )
    .eq("api_football_fixture_id", fixtureId)
    .maybeSingle();

  if (findError) {
    outcome = "db_error";
    result.errors.push(findError.message);
    return;
  }

  let existing = existingRow;

  if (!existing) {
    const fifaMatchNumber = resolveFifaMatchNumber(item);
    if (fifaMatchNumber != null) {
      const { data: byPlaceholder, error: phErr } = await supabase
        .from("partidos")
        .select(
          "id, estatus, fase, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante, metadata, api_football_fixture_id, fecha_kickoff",
        )
        .eq("api_football_fixture_id", placeholderFixtureId(fifaMatchNumber))
        .maybeSingle();
      if (phErr) {
        outcome = "db_error";
        result.errors.push(phErr.message);
        return;
      }
      if (byPlaceholder) {
        existing = byPlaceholder;
      }
    }
  }

  if (!existing) {
    const teamKey = `${normalizeTeamNameForMatch(row.equipo_local_nombre)}|${normalizeTeamNameForMatch(row.equipo_visitante_nombre)}`;
    const kickoffMs = new Date(row.fecha_kickoff).getTime();
    const fromIso = new Date(kickoffMs - 3 * 60 * 60 * 1000).toISOString();
    const toIso = new Date(kickoffMs + 3 * 60 * 60 * 1000).toISOString();
    const { data: knockoutRows, error: koErr } = await supabase
      .from("partidos")
      .select(
        "id, estatus, fase, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante, metadata, api_football_fixture_id, fecha_kickoff",
      )
      .gte("api_football_fixture_id", PLACEHOLDER_FIXTURE_BASE)
      .gte("fecha_kickoff", fromIso)
      .lte("fecha_kickoff", toIso);

    if (koErr) {
      outcome = "db_error";
      result.errors.push(koErr.message);
      return;
    }

    for (const candidate of knockoutRows ?? []) {
      const candidateKey = `${normalizeTeamNameForMatch(String(candidate.equipo_local_nombre))}|${normalizeTeamNameForMatch(String(candidate.equipo_visitante_nombre))}`;
      if (candidateKey === teamKey) {
        existing = candidate;
        break;
      }
    }
  }

  if (!existing) {
    outcome = "not_in_db";
    return;
  }

  const linkedFromPlaceholder =
    existing.api_football_fixture_id >= PLACEHOLDER_FIXTURE_BASE &&
    existing.api_football_fixture_id !== fixtureId;

  partidoId = existing.id;

  const prevEstatus = (existing.estatus ?? "programado") as EstatusPartido;
  const nextEstatus = row.estatus;

  if (shouldResetLiveNotifyState(prevEstatus, nextEstatus)) {
    const cleared = await resetPartidoLiveNotifyState(
      supabase,
      existing.id,
      typeof existing.metadata === "object" && existing.metadata !== null
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {},
    );
    existing = { ...existing, metadata: cleared };
    console.info(
      `[sync-live] notify reset partido=${existing.id} ${prevEstatus}→${nextEstatus}`,
    );
  }

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

  const prevDbScore = {
    local: existing.marcador_local,
    away: existing.marcador_visitante,
  };
  const scoreDecreaseDetected =
    prevDbScore.local != null &&
    prevDbScore.away != null &&
    row.marcador_local != null &&
    row.marcador_visitante != null &&
    scoreDecreased(prevDbScore, row.marcador_local, row.marcador_visitante);

  const penScores = extractPenaltyScoresFromFixture(item);
  const { reloj, minuto_actual: minutoReloj } = buildRelojFromApiSportsFixture(
    item,
    existing.metadata,
    new Date(),
    penScores,
  );

  const metadata: Record<string, unknown> = mergePenaltyMetadata(
    {
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
    },
    penScores.local,
    penScores.visitante,
  );

  if (baseline) {
    metadata.gol_notify_score = baseline;
  }

  const kickoffChanged = shouldSyncKickoffFromApi(
    nextEstatus,
    String(existing.fecha_kickoff),
    row.fecha_kickoff,
  );

  const { error: updateError } = await supabase
    .from("partidos")
    .update({
      estatus: row.estatus,
      marcador_local: row.marcador_local,
      marcador_visitante: row.marcador_visitante,
      minuto_actual: minutoReloj ?? row.minuto_actual,
      metadata,
      updated_at: new Date().toISOString(),
      ...(linkedFromPlaceholder ? { api_football_fixture_id: fixtureId } : {}),
      ...(kickoffChanged ? { fecha_kickoff: row.fecha_kickoff } : {}),
    })
    .eq("id", existing.id);

  if (updateError) {
    outcome = "update_error";
    result.errors.push(updateError.message);
    return;
  }

  status = row.estatus;
  minuto = minutoReloj ?? row.minuto_actual ?? null;

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

      let momentos = mapFixtureEventsToMomentos(
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

      const baselinePenales = baselineNotifiedPenalFallados(existing.metadata, momentos);
      if (baselinePenales) {
        Object.assign(
          metadata,
          buildPenalFalladoNotifyMetadata(metadata, baselinePenales),
        );
      }

      const relojPeriod = parseRelojFromMetadata({ reloj })?.period;
      const statusShort = item.fixture.status.short?.trim().toUpperCase() ?? "";
      const shootoutLive = isPenaltyShootoutLive(statusShort, relojPeriod);
      const shootoutEnding =
        row.estatus === "finalizado" &&
        (statusShort === "PEN" || statusShort === "AP" || relojPeriod === "AP");
      const prevPen = readPenaltyScoresFromMetadata(existing.metadata);
      const livePen = readPenaltyScoresFromMetadata(metadata);
      const penHome = livePen.local ?? 0;
      const penAway = livePen.visitante ?? 0;
      const inShootoutContext =
        shootoutLive ||
        shootoutEnding ||
        (livePen.local != null && livePen.visitante != null);

      if (
        !baselinePenales &&
        inShootoutContext &&
        (shootoutLive ||
          shootoutEnding ||
          row.estatus === "en_vivo" ||
          row.estatus === "medio_tiempo")
      ) {
        let penalMeta = existing.metadata;
        const localName = String(existing.equipo_local_nombre ?? item.teams.home.name);
        const visitanteName = String(
          existing.equipo_visitante_nombre ?? item.teams.away.name,
        );
        for (const penal of findNewPenalFallados(penalMeta, momentos)) {
          const penalResult = await handlePenalFalladoEvent({
            supabase,
            partidoId: existing.id,
            momento: penal,
            localName,
            visitanteName,
            penHome,
            penAway,
          });
          if (!penalResult.ok) {
            result.errors.push(penalResult.message ?? "Error procesando penal fallado");
          } else if (penalResult.message === "Penal fallado procesado") {
            result.penalFalladosNotified = (result.penalFalladosNotified ?? 0) + 1;
            penalMeta = buildPenalFalladoNotifyMetadata(penalMeta, [penal.id]);
            Object.assign(metadata, penalMeta);
          }
        }
      }

      if (
        inShootoutContext &&
        livePen.local != null &&
        livePen.visitante != null &&
        !isPenScoreAlreadyNotified(existing.metadata, livePen.local, livePen.visitante)
      ) {
        let penNotify = getPenNotifyScore(existing.metadata);
        const penBaseline = baselinePenNotifyScore(existing.metadata, {
          local: livePen.local,
          away: livePen.visitante,
        });
        if (penBaseline) {
          Object.assign(
            metadata,
            buildPenNotifyMetadata(metadata, penBaseline.local, penBaseline.away),
          );
          penNotify = penBaseline;
        }

        if (
          penNotify &&
          penScoreIncreased(penNotify, livePen.local, livePen.visitante) &&
          (shootoutLive || shootoutEnding)
        ) {
          const side = penaltySideIncreased(prevPen, livePen);
          if (side && fetchedEvents) {
            const teamId =
              side === "local" ? item.teams.home.id : item.teams.away.id;
            const kickIndex =
              side === "local" ? livePen.local! : livePen.visitante!;
            const goalEv = findNthPenaltyGoalForTeam(
              fetchedEvents,
              teamId,
              kickIndex,
            );
            const localName = String(
              existing.equipo_local_nombre ?? item.teams.home.name,
            );
            const visitanteName = String(
              existing.equipo_visitante_nombre ?? item.teams.away.name,
            );
            const goleador =
              goalEv?.player?.name?.trim() ??
              (side === "local" ? localName : visitanteName);
            const equipo =
              side === "local"
                ? getTeamDisplayNameEs(localName)
                : getTeamDisplayNameEs(visitanteName);
            const eventKey = `penal-anotado-${livePen.local}-${livePen.visitante}`;

            const anotadoResult = await handlePenalAnotadoEvent({
              supabase,
              partidoId: existing.id,
              localName,
              visitanteName,
              penHome: livePen.local,
              penAway: livePen.visitante,
              goleador,
              equipo,
              eventKey,
            });
            if (!anotadoResult.ok) {
              result.errors.push(
                anotadoResult.message ?? "Error procesando penal anotado",
              );
            } else if (anotadoResult.message === "Penal anotado procesado") {
              result.goalsNotified += 1;
              Object.assign(
                metadata,
                buildPenNotifyMetadata(metadata, livePen.local, livePen.visitante),
              );
            }
          }
        }
      }

      if (
        scoreDecreaseDetected &&
        prevDbScore.local != null &&
        prevDbScore.away != null &&
        row.marcador_local != null &&
        row.marcador_visitante != null &&
        (row.estatus === "en_vivo" || row.estatus === "medio_tiempo")
      ) {
        const side = detectScoreDecreaseSide(
          { local: prevDbScore.local, away: prevDbScore.away },
          { local: row.marcador_local, away: row.marcador_visitante },
        );
        if (side) {
          const nextScore = {
            local: row.marcador_local,
            away: row.marcador_visitante,
          };
          const notifyKey = cancelledGoalNotifyKey(
            { local: prevDbScore.local, away: prevDbScore.away },
            nextScore,
            side,
          );
          if (!isCancelledGoalAlreadyNotified(existing.metadata, notifyKey)) {
            const affectedIsLocal = side === "local";
            const localDisplay = getTeamDisplayNameEs(
              String(existing.equipo_local_nombre ?? item.teams.home.name),
            );
            const visitanteDisplay = getTeamDisplayNameEs(
              String(existing.equipo_visitante_nombre ?? item.teams.away.name),
            );
            const varEv = findVarGoalCancelledForTeam(
              fetchedEvents,
              item.teams.home.id,
              affectedIsLocal,
            );
            const golAnulado = buildGolAnuladoMomento({
              id: `gol-anulado:${notifyKey}`,
              jugador:
                varEv?.player?.name?.trim() ||
                (affectedIsLocal ? localDisplay : visitanteDisplay),
              equipo: affectedIsLocal ? localDisplay : visitanteDisplay,
              minuto: varEv?.time.elapsed ?? null,
              extra: varEv?.time.extra ?? null,
              detail: varEv?.detail ?? "Goal cancelled",
              es_local: affectedIsLocal,
            });
            momentos = mergeGolAnuladoMomento(momentos, golAnulado);
            Object.assign(metadata, buildMomentosMetadata(metadata, momentos));

            const cancelResult = await handleGoalCancelledEvent({
              supabase,
              partidoId: existing.id,
              momento: golAnulado,
              marcadorLocal: row.marcador_local,
              marcadorVisitante: row.marcador_visitante,
              notifyKey,
            });
            if (!cancelResult.ok) {
              result.errors.push(
                cancelResult.message ?? "Error procesando gol anulado",
              );
            } else if (cancelResult.message === "Gol anulado procesado") {
              result.goalsCancelledNotified = (result.goalsCancelledNotified ?? 0) + 1;
              Object.assign(
                metadata,
                buildCancelledGoalNotifyMetadata(metadata, [notifyKey]),
                buildGolNotifyMetadata(
                  metadata,
                  row.marcador_local,
                  row.marcador_visitante,
                ),
              );
            }
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
    penaltyScores: resolvePenaltyScores(penScores.local, penScores.visitante),
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

  if (
    row.estatus === "finalizado" &&
    !hasPersistedMatchStatistics(existing.metadata)
  ) {
    try {
      const statsTeams = await fetchApiSportsFixtureStatistics(apiKey, fixtureId);
      result.apiRequests = (result.apiRequests ?? 0) + 1;
      const normalized = normalizeApiSportsFixtureStatistics(
        statsTeams,
        item.teams.home.id,
      );
      if (normalized) {
        Object.assign(
          metadata,
          buildStatisticsMetadata(metadata, normalized),
        );
        persistMetadata = true;
      }
    } catch (e) {
      console.warn(
        `[sync-live] statistics fetch skipped fixture=${fixtureId}:`,
        e instanceof Error ? e.message : e,
      );
    }
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
  } finally {
    logSyncLiveFixture({
      fixture_id: fixtureId,
      partido_id: partidoId,
      status,
      minuto,
      duration_ms: Date.now() - startedAt,
      outcome,
    });
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

/** Partidos aplazados: reconsultar siempre (pueden haberse reprogramado o jugado). */
async function fetchPostponedFixtureIds(
  supabase: SupabaseClient,
): Promise<number[]> {
  const { data: rows, error } = await supabase
    .from("partidos")
    .select("api_football_fixture_id")
    .eq("estatus", "aplazado")
    .not("api_football_fixture_id", "is", null);

  if (error) throw new Error(error.message);

  return (rows ?? [])
    .map((r) => r.api_football_fixture_id as number | null)
    .filter((id): id is number => id != null && id < 9_000_000);
}

/** Partidos en ventana de sync-live aún no en live=all (p. ej. recién arrancó). */
async function fetchInWindowFixtureIds(
  supabase: SupabaseClient,
  config: LiveSyncWindowConfig = getLiveSyncWindowConfig(),
): Promise<number[]> {
  const now = Date.now();
  const soonIso = new Date(now + config.beforeMinutes * 60_000).toISOString();
  const lookbackIso = new Date(
    now - config.maxHoursAfterKickoff * 60 * 60_000,
  ).toISOString();

  const { data: rows, error } = await supabase
    .from("partidos")
    .select("api_football_fixture_id")
    .in("estatus", ["programado", "en_vivo", "medio_tiempo"])
    .gte("fecha_kickoff", lookbackIso)
    .lte("fecha_kickoff", soonIso)
    .not("api_football_fixture_id", "is", null);

  if (error) throw new Error(error.message);

  return (rows ?? [])
    .map((r) => r.api_football_fixture_id as number | null)
    .filter((id): id is number => id != null && id < 9_000_000);
}

/** Eliminatorias finalizadas en empate sin marcador de penales en metadata. */
async function fetchKnockoutMissingPenaltyFixtureIds(
  supabase: SupabaseClient,
): Promise<number[]> {
  const { data: rows, error } = await supabase
    .from("partidos")
    .select(
      "api_football_fixture_id, marcador_local, marcador_visitante, metadata",
    )
    .neq("fase", "grupos")
    .eq("estatus", "finalizado")
    .not("api_football_fixture_id", "is", null);

  if (error) throw new Error(error.message);

  return (rows ?? [])
    .filter((row) =>
      isKnockoutPenaltyMetadataMissing({
        marcador_local: row.marcador_local as number | null,
        marcador_visitante: row.marcador_visitante as number | null,
        metadata: row.metadata,
      }),
    )
    .map((r) => r.api_football_fixture_id as number | null)
    .filter((id): id is number => id != null && id < 9_000_000);
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
  const syncStartedAt = Date.now();
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
  result.liveFixtureCount = liveItems.length;
  logSyncLiveStart(liveItems.length);

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
    const [staleIds, overdueIds, windowIds, postponedIds, missingPenaltyIds] =
      await Promise.all([
      fetchStaleLiveFixtureIds(supabase, liveIds),
      fetchOverdueLiveFixtureIds(supabase),
      fetchInWindowFixtureIds(supabase),
      fetchPostponedFixtureIds(supabase),
      fetchKnockoutMissingPenaltyFixtureIds(supabase),
    ]);
    const refetchIds = [...new Set([...staleIds, ...overdueIds, ...windowIds, ...postponedIds, ...missingPenaltyIds])].filter(
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

  const durationMs = Date.now() - syncStartedAt;
  result.durationMs = durationMs;
  logSyncLiveComplete({
    duration_ms: durationMs,
    live_fixture_count: liveItems.length,
    fetched: result.fetched,
    updated: result.updated,
    live: result.live,
    api_requests: result.apiRequests ?? 0,
    errors: result.errors.length,
  });

  return result;
}

