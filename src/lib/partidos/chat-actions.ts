"use server";

import { revalidatePath } from "next/cache";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { metadataPartidoGlobal } from "@/lib/chat/scopes";
import {
  isMatchChatOpen,
  type PartidoChatInput,
} from "@/lib/chat/match-chat-window";
import { trackEventServer } from "@/lib/analytics/track";
import { moderationErrorToReason } from "@/lib/moderation/analytics-reason";
import { validateUserChatMessage } from "@/lib/moderation/validate-user-message";
import { createClient } from "@/lib/supabase/server";
import type { MensajeChatRealtimeRow } from "@/types/chat";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Inicia sesión para chatear" };
  }

  const moderation = await validateUserChatMessage(user.id, contenido, {
    kind: "partido",
    partidoId,
    ligaId: LIGA_GLOBAL_ID,
  });
  if (!moderation.ok) {
    trackEventServer("chat_message_blocked_by_moderation", {
      scope: "partido",
      reason: moderationErrorToReason(moderation.error),
    });
    return { ok: false, error: moderation.error };
  }
  const text = moderation.content;

  const { data: partido, error: partidoError } = await supabase
    .from("partidos")
    .select("fecha_kickoff, estatus, metadata, updated_at")
    .eq("id", partidoId)
    .single();

  if (partidoError || !partido) {
    return { ok: false, error: "Partido no encontrado" };
  }

  const partidoInput = partido as PartidoChatInput;

  if (!isMatchChatOpen(partidoInput)) {
    return {
      ok: false,
      error: "El chat no está abierto para enviar mensajes",
    };
  }

  const { error } = await supabase.from("mensajes_chat").insert({
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    usuario_id: user.id,
    tipo: "usuario",
    contenido: text,
    metadata: metadataPartidoGlobal(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  trackEventServer("chat_message_sent", { scope: "partido" });
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
  trackEventServer("chat_message_reported", {
    scope: mensaje.partido_id ? "partido" : "grupo",
  });
  if (mensaje.partido_id) {
    revalidatePath(`/partidos/${mensaje.partido_id}`);
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
  }
  return { ok: true, mensaje };
}
