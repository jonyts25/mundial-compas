import { resolveIsModerator } from "@/lib/auth/moderator";
import { fetchGlobalPronosticoForPartidoOrSibling } from "@/lib/partidos/pronostico-sibling-lookup";
import {
  enrichPronosticoPuntosFromPartido,
  resolveCanonicalSiblingFromList,
} from "@/lib/partidos/partido-match-key";
import {
  assertAuthenticatedUserId,
  createServerDataClient,
} from "@/lib/supabase/server-data";
import { fetchMensajesChatHistorial } from "@/lib/partidos/chat-queries";
import { syncPartidoLineups } from "@/lib/partidos/sync-lineups";
import { syncPartidoEventos } from "@/lib/partidos/sync-partido-eventos";
import { parseMomentosFromMetadata } from "@/lib/api-football/match-events";
import { readLineupsFromMetadata } from "@/lib/partidos/lineups-types";
import { createClient } from "@/lib/supabase/server";
import type { Partido, PronosticoPartido, Usuario } from "@/types/database";
import type { MensajeChatConAutor } from "@/types/chat";

const PARTIDO_SELECT =
  "id, api_football_fixture_id, fase, grupo, jornada, sede, metadata, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, updated_at";

export type PartidoDetalle = Partido & {
  api_football_fixture_id?: number | null;
  sede: string | null;
  metadata: Record<string, unknown> | null;
  updated_at?: string;
};

export interface PartidoDetallePageData {
  usuario: Usuario;
  partido: PartidoDetalle;
  /** Si el enlace apuntaba a un duplicado placeholder, id canonical para redirect. */
  canonicalPartidoId?: string;
  pronostico: PronosticoPartido | null;
  mensajes: MensajeChatConAutor[];
  esAdmin: boolean;
  pushPartidoSilenciado: boolean;
}

export async function fetchPartidoDetallePageData(
  userId: string,
  partidoId: string,
): Promise<PartidoDetallePageData | null> {
  assertAuthenticatedUserId(userId);

  const supabase = await createClient();
  const admin = createServerDataClient();

  const [{ data: usuario, error: userError }, { data: partido, error: partidoError }, { data: muteRow }] =
    await Promise.all([
      supabase
        .from("usuarios")
        .select("id, nombre_visible, avatar_url, quiniela_paga")
        .eq("id", userId)
        .single(),
      supabase.from("partidos").select(PARTIDO_SELECT).eq("id", partidoId).single(),
      supabase
        .from("push_partidos_silenciados")
        .select("partido_id")
        .eq("usuario_id", userId)
        .eq("partido_id", partidoId)
        .maybeSingle(),
    ]);

  if (userError || !usuario || partidoError || !partido) {
    return null;
  }

  let partidoResolved = partido as PartidoDetalle;
  if (partidoResolved.fase && partidoResolved.fase !== "grupos") {
    const kickoffMs = new Date(partidoResolved.fecha_kickoff).getTime();
    const fromIso = new Date(kickoffMs - 3 * 60 * 60 * 1000).toISOString();
    const toIso = new Date(kickoffMs + 3 * 60 * 60 * 1000).toISOString();
    const { data: siblings, error: siblingsError } = await admin
      .from("partidos")
      .select(PARTIDO_SELECT)
      .neq("fase", "grupos")
      .gte("fecha_kickoff", fromIso)
      .lte("fecha_kickoff", toIso);

    if (!siblingsError && siblings?.length) {
      const canonical = resolveCanonicalSiblingFromList(
        partidoResolved,
        siblings as PartidoDetalle[],
      );
      if (canonical) {
        partidoResolved = canonical;
      }
    }
  }

  const effectivePartidoId = partidoResolved.id;
  const pronosticoRaw = await fetchGlobalPronosticoForPartidoOrSibling(
    admin,
    userId,
    partidoResolved,
  );
  const pronostico = pronosticoRaw
    ? {
        ...pronosticoRaw,
        ...enrichPronosticoPuntosFromPartido(partidoResolved, {
          goles_local: pronosticoRaw.goles_local,
          goles_visitante: pronosticoRaw.goles_visitante,
          puntos: pronosticoRaw.puntos,
        }),
      }
    : null;

  const esAdmin = await resolveIsModerator(supabase, userId);

  const mensajesVisibles = await fetchMensajesChatHistorial(
    effectivePartidoId,
    esAdmin,
  );

  let partidoDetalle = partidoResolved;
  if (
    !readLineupsFromMetadata(partido.metadata) &&
    partido.api_football_fixture_id
  ) {
    const sync = await syncPartidoLineups(admin, partido);
    if (sync.lineups) {
      partidoDetalle = {
        ...partidoDetalle,
        metadata: {
          ...(partidoDetalle.metadata ?? {}),
          alineaciones: sync.lineups,
        },
      };
    }
  }

  const estatusEventos = partidoDetalle.estatus;
  if (
    parseMomentosFromMetadata(partidoDetalle.metadata).length === 0 &&
    partidoDetalle.api_football_fixture_id &&
    (estatusEventos === "en_vivo" ||
      estatusEventos === "medio_tiempo" ||
      estatusEventos === "finalizado")
  ) {
    const { eventos } = await syncPartidoEventos(admin, partidoDetalle);
    if (eventos.length > 0) {
      partidoDetalle = {
        ...partidoDetalle,
        metadata: {
          ...(partidoDetalle.metadata ?? {}),
          eventos_clave: eventos,
        },
      };
    }
  }

  return {
    usuario: usuario as Usuario,
    partido: partidoDetalle,
    canonicalPartidoId:
      effectivePartidoId !== partidoId ? effectivePartidoId : undefined,
    pronostico: pronostico as PronosticoPartido | null,
    mensajes: mensajesVisibles,
    esAdmin,
    pushPartidoSilenciado: Boolean(muteRow),
  };
}
