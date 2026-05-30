"use server";

import { revalidatePath } from "next/cache";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const MAX_LENGTH = 500;

export type ChatGeneralActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendChatGeneralMessage(
  contenido: string,
): Promise<ChatGeneralActionResult> {
  const text = contenido.trim();
  if (!text) return { ok: false, error: "Escribe un mensaje" };
  if (text.length > MAX_LENGTH) {
    return { ok: false, error: `Máximo ${MAX_LENGTH} caracteres` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Inicia sesión para chatear" };

  const { error } = await supabase.from("mensajes_chat").insert({
    partido_id: null,
    liga_id: LIGA_GLOBAL_ID,
    usuario_id: user.id,
    tipo: "usuario",
    contenido: text,
    metadata: { sala: "liga_general" },
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/chat-general");
  return { ok: true };
}
