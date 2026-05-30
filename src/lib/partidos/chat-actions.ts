"use server";

import { revalidatePath } from "next/cache";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { isChatAbierto } from "@/lib/partidos/chat-window";
import { createClient } from "@/lib/supabase/server";
import type { MensajeChatRealtimeRow } from "@/types/chat";

const MAX_LENGTH = 500;

export type ChatActionResult =
  | { ok: true; mensaje?: MensajeChatRealtimeRow }
  | { ok: false; error: string };

export type SendChatMessageResult = ChatActionResult;

function mapRpcRow(row: Record<string, unknown>): MensajeChatRealtimeRow {
  return {
    id: row.id as string,
    partido_id: row.partido_id as string,
    liga_id: row.liga_id as string,
    usuario_id: (row.usuario_id as string | null) ?? null,
    tipo: row.tipo as MensajeChatRealtimeRow["tipo"],
    contenido: row.contenido as string,
    created_at: row.created_at as string,
    reportado: Boolean(row.reportado),
    conteo_reportes: Number(row.conteo_reportes ?? 0),
    oculto: Boolean(row.oculto),
  };
}

export async function sendChatMessage(
  partidoId: string,
  contenido: string,
): Promise<SendChatMessageResult> {
  const text = contenido.trim();
  if (!text) {
    return { ok: false, error: "Escribe un mensaje" };
  }
  if (text.length > MAX_LENGTH) {
    return { ok: false, error: `Máximo ${MAX_LENGTH} caracteres` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Inicia sesión para chatear" };
  }

  const { data: partido, error: partidoError } = await supabase
    .from("partidos")
    .select("fecha_kickoff")
    .eq("id", partidoId)
    .single();

  if (partidoError || !partido) {
    return { ok: false, error: "Partido no encontrado" };
  }

  if (!isChatAbierto(partido.fecha_kickoff)) {
    return {
      ok: false,
      error: "El chat aún no está abierto para este partido",
    };
  }

  const { error } = await supabase.from("mensajes_chat").insert({
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    usuario_id: user.id,
    tipo: "usuario",
    contenido: text,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/partidos/${partidoId}`);
  return { ok: true };
}

export async function reportarMensaje(
  mensajeId: string,
): Promise<ChatActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Inicia sesión" };
  }

  const { data, error } = await supabase.rpc("reportar_mensaje_chat", {
    p_mensaje_id: mensajeId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const mensaje = mapRpcRow(data as Record<string, unknown>);
  if (mensaje.partido_id) {
    revalidatePath(`/partidos/${mensaje.partido_id}`);
  } else {
    revalidatePath("/chat-general");
  }
  return { ok: true, mensaje };
}

export async function aprobarMensaje(mensajeId: string): Promise<ChatActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Inicia sesión" };
  }

  const { data, error } = await supabase.rpc("aprobar_mensaje_chat", {
    p_mensaje_id: mensajeId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const mensaje = mapRpcRow(data as Record<string, unknown>);
  if (mensaje.partido_id) {
    revalidatePath(`/partidos/${mensaje.partido_id}`);
  } else {
    revalidatePath("/chat-general");
  }
  return { ok: true, mensaje };
}

export async function eliminarMensaje(mensajeId: string): Promise<ChatActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Inicia sesión" };
  }

  const { data, error } = await supabase.rpc("eliminar_mensaje_chat", {
    p_mensaje_id: mensajeId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const mensaje = mapRpcRow(data as Record<string, unknown>);
  if (mensaje.partido_id) {
    revalidatePath(`/partidos/${mensaje.partido_id}`);
  } else {
    revalidatePath("/chat-general");
  }
  return { ok: true, mensaje };
}
