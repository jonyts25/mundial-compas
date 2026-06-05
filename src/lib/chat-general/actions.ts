"use server";

/**
 * @deprecated Chat general global retirado. Ruta `/chat-general` redirige a `/`.
 */
import { CHAT_GENERAL_DISABLED } from "@/lib/legacy/global-economic-deprecated";

export type ChatGeneralActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendChatGeneralMessage(
  _contenido: string,
): Promise<ChatGeneralActionResult> {
  return { ok: false, error: CHAT_GENERAL_DISABLED };
}
