import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { createServerDataClient } from "@/lib/supabase/server-data";
import type { MensajeChatConAutor } from "@/types/chat";

const MENSAJE_SELECT =
  "id, partido_id, liga_id, usuario_id, tipo, contenido, created_at, reportado, conteo_reportes, oculto";

type MensajeDbRow = {
  id: string;
  partido_id: string;
  liga_id: string;
  usuario_id: string | null;
  tipo: MensajeChatConAutor["tipo"];
  contenido: string;
  created_at: string;
  reportado?: boolean;
  conteo_reportes?: number;
  oculto?: boolean;
};

type UsuarioDbRow = {
  id: string;
  nombre_visible: string;
  avatar_url: string | null;
};

/**
 * Historial del chat por partido (service role, solo en servidor).
 * Filtra ocultos salvo para moderadores.
 */
export async function fetchMensajesChatHistorial(
  partidoId: string,
  esAdmin: boolean,
): Promise<MensajeChatConAutor[]> {
  const admin = createServerDataClient();

  let rows: MensajeDbRow[] | null = null;
  let error: { message: string } | null = null;

  const full = await admin
    .from("mensajes_chat")
    .select(MENSAJE_SELECT)
    .eq("partido_id", partidoId)
    .eq("liga_id", LIGA_GLOBAL_ID)
    .order("created_at", { ascending: true })
    .limit(200);

  rows = full.data as MensajeDbRow[] | null;
  error = full.error;

  if (error?.message.includes("column") || error?.message.includes("does not exist")) {
    const legacy = await admin
      .from("mensajes_chat")
      .select(
        "id, partido_id, liga_id, usuario_id, tipo, contenido, created_at",
      )
      .eq("partido_id", partidoId)
      .eq("liga_id", LIGA_GLOBAL_ID)
      .order("created_at", { ascending: true })
      .limit(200);
    rows = legacy.data as MensajeDbRow[] | null;
    error = legacy.error;
  }

  if (error) {
    throw new Error(`No se pudo cargar el historial del chat: ${error.message}`);
  }

  const lista = rows ?? [];
  const usuarioIds = [
    ...new Set(
      lista
        .map((m) => m.usuario_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const autoresPorId = new Map<string, UsuarioDbRow>();
  if (usuarioIds.length > 0) {
    const { data: usuarios } = await admin
      .from("usuarios")
      .select("id, nombre_visible, avatar_url")
      .in("id", usuarioIds);

    for (const u of usuarios ?? []) {
      autoresPorId.set(u.id, u as UsuarioDbRow);
    }
  }

  const mensajes: MensajeChatConAutor[] = lista.map((m) => {
    const u = m.usuario_id ? autoresPorId.get(m.usuario_id) : undefined;
    return {
      id: m.id,
      partido_id: m.partido_id,
      liga_id: m.liga_id,
      usuario_id: m.usuario_id,
      tipo: m.tipo,
      contenido: m.contenido,
      created_at: m.created_at,
      reportado: m.reportado ?? false,
      conteo_reportes: m.conteo_reportes ?? 0,
      oculto: m.oculto ?? false,
      autor: u
        ? {
            id: u.id,
            nombre_visible: u.nombre_visible,
            avatar_url: u.avatar_url,
          }
        : null,
    };
  });

  return esAdmin ? mensajes : mensajes.filter((m) => !m.oculto);
}
