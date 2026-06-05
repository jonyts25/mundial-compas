import { CHAT_SCOPE_GRUPO_PRIVADO } from "@/lib/chat/scopes";
import { createServerDataClient } from "@/lib/supabase/server-data";
import type { MensajeChatConAutor } from "@/types/chat";

const MENSAJE_SELECT =
  "id, partido_id, liga_id, usuario_id, tipo, contenido, created_at, reportado, conteo_reportes, oculto";

type MensajeDbRow = {
  id: string;
  partido_id: string | null;
  liga_id: string;
  usuario_id: string | null;
  tipo: MensajeChatConAutor["tipo"];
  contenido: string;
  created_at: string;
  reportado?: boolean;
  conteo_reportes?: number;
  oculto?: boolean;
  metadata?: Record<string, unknown> | null;
};

export async function fetchGrupoChatHistorial(
  ligaId: string,
  esAdmin: boolean,
): Promise<MensajeChatConAutor[]> {
  const admin = createServerDataClient();

  const { data: rows, error } = await admin
    .from("mensajes_chat")
    .select(MENSAJE_SELECT)
    .eq("liga_id", ligaId)
    .is("partido_id", null)
    .filter("metadata->>scope", "eq", CHAT_SCOPE_GRUPO_PRIVADO)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(`No se pudo cargar el chat del grupo: ${error.message}`);
  }

  const lista = (rows ?? []) as MensajeDbRow[];
  const usuarioIds = [
    ...new Set(
      lista
        .map((m) => m.usuario_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const autoresPorId = new Map<
    string,
    { id: string; nombre_visible: string; avatar_url: string | null }
  >();

  if (usuarioIds.length > 0) {
    const { data: usuarios } = await admin
      .from("usuarios")
      .select("id, nombre_visible, avatar_url")
      .in("id", usuarioIds);

    for (const u of usuarios ?? []) {
      autoresPorId.set(u.id, {
        id: u.id,
        nombre_visible: u.nombre_visible as string,
        avatar_url: u.avatar_url as string | null,
      });
    }
  }

  const mensajes: MensajeChatConAutor[] = lista.map((m) => {
    const u = m.usuario_id ? autoresPorId.get(m.usuario_id) : undefined;
    return {
      id: m.id,
      partido_id: m.partido_id ?? "",
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
