import type { SupabaseClient } from "@supabase/supabase-js";
import type { MomentoClave } from "@/lib/api-football/match-events";
import { relojToMetadata, type MatchClockState } from "@/lib/partidos/match-clock";
import { placeholderFixtureId } from "@/lib/world-cup/knockout-match-ids";
import type { EstatusPartido } from "@/types/database";

export type ManualLiveSnapshot = {
  /** Idempotencia: no reaplicar si ya está en metadata.manual_live_snapshot_id */
  id: string;
  fifaMatchNumber: number;
  estatus: EstatusPartido;
  marcadorLocal: number;
  marcadorVisitante: number;
  minutoActual: number | null;
  reloj: MatchClockState;
  eventosClave: MomentoClave[];
};

/** Snapshots operados sin API (cuota agotada). El cron sync-live los aplica sin requests. */
export const MANUAL_LIVE_SNAPSHOTS: ManualLiveSnapshot[] = [
  {
    id: "m103-ft-2026-07-18T2304Z",
    fifaMatchNumber: 103,
    estatus: "finalizado",
    marcadorLocal: 4,
    marcadorVisitante: 6,
    minutoActual: null,
    reloj: {
      period: "FT",
      anchorMinute: null,
      anchoredAt: "2026-07-18T23:04:00.000Z",
      ticking: false,
    },
    eventosClave: [
      {
        id: "gol:eng:rice:3:0",
        tipo: "gol",
        jugador: "Declan Rice",
        equipo: "Inglaterra",
        minuto: 3,
        extra: null,
        detail: "Normal Goal",
        es_local: false,
      },
      {
        id: "gol:eng:konsa:18:0",
        tipo: "gol",
        jugador: "Ezri Konsa",
        equipo: "Inglaterra",
        minuto: 18,
        extra: null,
        detail: "Normal Goal",
        es_local: false,
      },
      {
        id: "gol:eng:saka:37:0",
        tipo: "gol",
        jugador: "Bukayo Saka",
        equipo: "Inglaterra",
        minuto: 37,
        extra: null,
        detail: "Normal Goal",
        es_local: false,
      },
      {
        id: "gol:eng:saka:45:1",
        tipo: "gol",
        jugador: "Bukayo Saka",
        equipo: "Inglaterra",
        minuto: 45,
        extra: 1,
        detail: "Normal Goal",
        es_local: false,
      },
      {
        id: "gol:fra:mbappe:48:0",
        tipo: "gol",
        jugador: "Kylian Mbappé",
        equipo: "Francia",
        minuto: 48,
        extra: null,
        detail: "Normal Goal",
        es_local: true,
      },
      {
        id: "gol:fra:barcola:54:0",
        tipo: "gol",
        jugador: "Bradley Barcola",
        equipo: "Francia",
        minuto: 54,
        extra: null,
        detail: "Normal Goal",
        es_local: true,
      },
      {
        id: "gol:fra:mbappe:66:0",
        tipo: "gol",
        jugador: "Kylian Mbappé",
        equipo: "Francia",
        minuto: 66,
        extra: null,
        detail: "Normal Goal",
        es_local: true,
      },
      {
        id: "gol:eng:saka:87:0:pen",
        tipo: "gol",
        jugador: "Bukayo Saka",
        equipo: "Inglaterra",
        minuto: 87,
        extra: null,
        detail: "Penalty",
        es_local: false,
      },
      {
        id: "gol:fra:dembele:90:6",
        tipo: "gol",
        jugador: "Ousmane Dembélé",
        equipo: "Francia",
        minuto: 90,
        extra: 6,
        detail: "Normal Goal",
        es_local: true,
      },
      {
        id: "gol:eng:bellingham:90:8",
        tipo: "gol",
        jugador: "Jude Bellingham",
        equipo: "Inglaterra",
        minuto: 90,
        extra: 8,
        detail: "Normal Goal",
        es_local: false,
      },
    ],
  },
  {
    id: "m104-ft-2026-07-19T2318Z",
    fifaMatchNumber: 104,
    estatus: "finalizado",
    marcadorLocal: 1,
    marcadorVisitante: 0,
    minutoActual: null,
    reloj: {
      period: "AET",
      anchorMinute: null,
      anchoredAt: "2026-07-19T23:18:00.000Z",
      ticking: false,
    },
    eventosClave: [
      {
        id: "roja:arg:enzo:92:0",
        tipo: "tarjeta_roja",
        jugador: "Enzo Fernández",
        equipo: "Argentina",
        minuto: 92,
        extra: null,
        detail: "Second Yellow",
        es_local: false,
      },
      {
        id: "gol:esp:torres:106:0",
        tipo: "gol",
        jugador: "Ferran Torres",
        equipo: "España",
        minuto: 106,
        extra: null,
        detail: "Normal Goal",
        es_local: true,
      },
    ],
  },
];

export type ApplyManualLiveSnapshotsResult = {
  applied: number;
  skipped: number;
  details: Array<{ fifaMatchNumber: number; snapshotId: string; partidoId: string }>;
  errors: string[];
};

async function findPartidoForSnapshot(
  supabase: SupabaseClient,
  fifaMatchNumber: number,
) {
  const placeholderId = placeholderFixtureId(fifaMatchNumber);

  const { data: byPlaceholder, error: phErr } = await supabase
    .from("partidos")
    .select("id, estatus, metadata, marcador_local, marcador_visitante")
    .eq("api_football_fixture_id", placeholderId)
    .maybeSingle();

  if (phErr) throw new Error(phErr.message);
  if (byPlaceholder) return byPlaceholder;

  const { data: byMeta, error: metaErr } = await supabase
    .from("partidos")
    .select("id, estatus, metadata, marcador_local, marcador_visitante")
    .filter("metadata->>fifa_match_number", "eq", String(fifaMatchNumber))
    .limit(1)
    .maybeSingle();

  if (metaErr) throw new Error(metaErr.message);
  return byMeta;
}

export async function applyManualLiveSnapshots(
  supabase: SupabaseClient,
  snapshots: ManualLiveSnapshot[] = MANUAL_LIVE_SNAPSHOTS,
): Promise<ApplyManualLiveSnapshotsResult> {
  const result: ApplyManualLiveSnapshotsResult = {
    applied: 0,
    skipped: 0,
    details: [],
    errors: [],
  };

  for (const snapshot of snapshots) {
    try {
      const existing = await findPartidoForSnapshot(
        supabase,
        snapshot.fifaMatchNumber,
      );
      if (!existing) {
        result.errors.push(
          `M${snapshot.fifaMatchNumber}: partido no encontrado en BD`,
        );
        continue;
      }

      const prevMeta =
        typeof existing.metadata === "object" && existing.metadata !== null
          ? (existing.metadata as Record<string, unknown>)
          : {};

      if (prevMeta.manual_live_snapshot_id === snapshot.id) {
        result.skipped += 1;
        continue;
      }

      if (
        existing.estatus === "finalizado" &&
        snapshot.estatus !== "finalizado"
      ) {
        result.skipped += 1;
        continue;
      }

      const metadata = {
        ...prevMeta,
        manual_live_snapshot_id: snapshot.id,
        manual_live_updated_at: new Date().toISOString(),
        eventos_clave: snapshot.eventosClave,
        reloj: relojToMetadata(snapshot.reloj),
      };

      const { error: updateErr } = await supabase
        .from("partidos")
        .update({
          estatus: snapshot.estatus,
          marcador_local: snapshot.marcadorLocal,
          marcador_visitante: snapshot.marcadorVisitante,
          minuto_actual: snapshot.minutoActual,
          metadata,
        })
        .eq("id", existing.id);

      if (updateErr) {
        result.errors.push(`M${snapshot.fifaMatchNumber}: ${updateErr.message}`);
        continue;
      }

      result.applied += 1;
      result.details.push({
        fifaMatchNumber: snapshot.fifaMatchNumber,
        snapshotId: snapshot.id,
        partidoId: existing.id,
      });
    } catch (e) {
      result.errors.push(
        `M${snapshot.fifaMatchNumber}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return result;
}
