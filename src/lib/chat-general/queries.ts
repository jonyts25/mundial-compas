/**
 * @deprecated Chat general (`sala: liga_general`). Solo lectura/inyecciones legacy en BD.
 */
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { getMexicoDayBounds } from "@/lib/datetime/mexico";
import {
  formatVarDatoMamalonMessage,
  pickDatoMamalonVariado,
} from "@/lib/datos-mamalones/pick";
import { createServerDataClient } from "@/lib/supabase/server-data";
import type { MensajeChatConAutor } from "@/types/chat";

const MENSAJE_SELECT =
  "id, partido_id, liga_id, usuario_id, tipo, contenido, created_at, reportado, conteo_reportes, oculto";

export async function fetchChatGeneralHistorial(
  esAdmin: boolean,
): Promise<MensajeChatConAutor[]> {
  const admin = createServerDataClient();

  const { data: rows, error } = await admin
    .from("mensajes_chat")
    .select(MENSAJE_SELECT)
    .eq("liga_id", LIGA_GLOBAL_ID)
    .is("partido_id", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(`No se pudo cargar el chat general: ${error.message}`);
  }

  const lista = rows ?? [];
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

/**
 * Inyecta un dato mamalón en el chat general (máx. 1 por día CDMX).
 * No bloquea si hay partidos programados — solo evita spam si ya hubo trivia hoy.
 */
export async function maybeInjectVarTrivia(): Promise<void> {
  const admin = createServerDataClient();
  const { start, end } = getMexicoDayBounds();

  const { count: triviaHoy } = await admin
    .from("mensajes_chat")
    .select("id", { count: "exact", head: true })
    .eq("liga_id", LIGA_GLOBAL_ID)
    .is("partido_id", null)
    .eq("tipo", "dato_mamalón")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if ((triviaHoy ?? 0) > 0) return;

  const pick = await pickDatoMamalonVariado(admin, {
    ligaId: LIGA_GLOBAL_ID,
    partidoId: null,
  });

  if (!pick) return;

  await admin.from("mensajes_chat").insert({
    partido_id: null,
    liga_id: LIGA_GLOBAL_ID,
    usuario_id: null,
    tipo: "dato_mamalón",
    contenido: formatVarDatoMamalonMessage(pick),
    dato_mamalón_id: pick.id,
    metadata: {
      sala: "liga_general",
      autor_display: "🤖 VAR",
      fuente: "trivia-diaria",
    },
  });
}
