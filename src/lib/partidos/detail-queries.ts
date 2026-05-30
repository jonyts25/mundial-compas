import { resolveIsModerator } from "@/lib/auth/moderator";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  assertAuthenticatedUserId,
  createServerDataClient,
} from "@/lib/supabase/server-data";
import { fetchMensajesChatHistorial } from "@/lib/partidos/chat-queries";
import { createClient } from "@/lib/supabase/server";
import type { Partido, PronosticoPartido, Usuario } from "@/types/database";
import type { MensajeChatConAutor } from "@/types/chat";

const PARTIDO_SELECT =
  "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual";

export interface PartidoDetallePageData {
  usuario: Usuario;
  partido: Partido;
  pronostico: PronosticoPartido | null;
  mensajes: MensajeChatConAutor[];
  esAdmin: boolean;
}

export async function fetchPartidoDetallePageData(
  userId: string,
  partidoId: string,
): Promise<PartidoDetallePageData | null> {
  assertAuthenticatedUserId(userId);

  const supabase = await createClient();
  const admin = createServerDataClient();

  const [{ data: usuario, error: userError }, { data: partido, error: partidoError }] =
    await Promise.all([
      supabase
        .from("usuarios")
        .select("id, nombre_visible, avatar_url, quiniela_paga")
        .eq("id", userId)
        .single(),
      supabase.from("partidos").select(PARTIDO_SELECT).eq("id", partidoId).single(),
    ]);

  if (userError || !usuario || partidoError || !partido) {
    return null;
  }

  const { data: pronostico } = await admin
    .from("pronosticos")
    .select("id, goles_local, goles_visitante, puntos")
    .eq("liga_id", LIGA_GLOBAL_ID)
    .eq("usuario_id", userId)
    .eq("partido_id", partidoId)
    .maybeSingle();

  const esAdmin = await resolveIsModerator(supabase, userId);

  const mensajesVisibles = await fetchMensajesChatHistorial(partidoId, esAdmin);

  return {
    usuario: usuario as Usuario,
    partido: partido as Partido,
    pronostico: pronostico as PronosticoPartido | null,
    mensajes: mensajesVisibles,
    esAdmin,
  };
}
