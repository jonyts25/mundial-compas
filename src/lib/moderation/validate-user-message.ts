import type { SupabaseClient } from "@supabase/supabase-js";
import { BLOCKED_WORDS } from "@/lib/moderation/blocked-words";
import {
  CHAT_ERRORS,
  CHAT_FLOOD_MAX_MESSAGES,
  CHAT_FLOOD_WINDOW_MS,
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_MIN_INTERVAL_MS,
  CHAT_REPEAT_MAX_COUNT,
  CHAT_REPEAT_WINDOW_MS,
} from "@/lib/moderation/config";
import {
  normalizeChatMessage,
  normalizeForDuplicateCheck,
} from "@/lib/moderation/normalize";
import { createServerDataClient } from "@/lib/supabase/server-data";

export type ChatModerationScope =
  | { kind: "partido"; partidoId: string; ligaId: string }
  | { kind: "grupo"; ligaId: string };

export type ModerationResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

function containsBlockedWord(text: string): boolean {
  if (BLOCKED_WORDS.length === 0) return false;
  const normalized = normalizeForDuplicateCheck(text);
  return BLOCKED_WORDS.some((word) => {
    const w = word.trim().toLowerCase();
    return w.length > 0 && normalized.includes(w);
  });
}

async function fetchRecentUserMessages(
  admin: SupabaseClient,
  userId: string,
  scope: ChatModerationScope,
  sinceIso: string,
): Promise<{ contenido: string; created_at: string }[]> {
  let query = admin
    .from("mensajes_chat")
    .select("contenido, created_at")
    .eq("usuario_id", userId)
    .eq("tipo", "usuario")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(12);

  if (scope.kind === "partido") {
    query = query
      .eq("partido_id", scope.partidoId)
      .eq("liga_id", scope.ligaId);
  } else {
    query = query.is("partido_id", null).eq("liga_id", scope.ligaId);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as { contenido: string; created_at: string }[];
}

function checkRateAndDuplicates(
  recent: { contenido: string; created_at: string }[],
  duplicateKey: string,
  nowMs: number,
): ModerationResult | null {
  const inFloodWindow = recent.filter(
    (m) =>
      nowMs - new Date(m.created_at).getTime() <= CHAT_FLOOD_WINDOW_MS,
  );

  if (inFloodWindow.length >= CHAT_FLOOD_MAX_MESSAGES) {
    return { ok: false, error: CHAT_ERRORS.flood };
  }

  const latest = recent[0];
  if (latest) {
    const elapsed = nowMs - new Date(latest.created_at).getTime();
    if (elapsed < CHAT_MIN_INTERVAL_MS) {
      return { ok: false, error: CHAT_ERRORS.flood };
    }
  }

  const inRepeatWindow = recent.filter(
    (m) =>
      nowMs - new Date(m.created_at).getTime() <= CHAT_REPEAT_WINDOW_MS,
  );
  const repeatCount = inRepeatWindow.filter(
    (m) => normalizeForDuplicateCheck(m.contenido) === duplicateKey,
  ).length;

  // Incluye el mensaje que intenta enviar ahora.
  if (repeatCount + 1 >= CHAT_REPEAT_MAX_COUNT) {
    return { ok: false, error: CHAT_ERRORS.repeated };
  }

  return null;
}

/**
 * Valida mensajes de usuario antes de insertar (server-side).
 * No aplica a mensajes sistema/VAR (service role).
 */
export async function validateUserChatMessage(
  userId: string,
  rawContent: string,
  scope: ChatModerationScope,
): Promise<ModerationResult> {
  const content = normalizeChatMessage(rawContent);

  if (!content) {
    return { ok: false, error: CHAT_ERRORS.empty };
  }

  if (content.length > CHAT_MAX_MESSAGE_LENGTH) {
    return { ok: false, error: CHAT_ERRORS.tooLong };
  }

  if (containsBlockedWord(content)) {
    return { ok: false, error: CHAT_ERRORS.blocked };
  }

  const nowMs = Date.now();
  const sinceIso = new Date(
    nowMs - Math.max(CHAT_FLOOD_WINDOW_MS, CHAT_REPEAT_WINDOW_MS),
  ).toISOString();

  const admin = createServerDataClient();
  const recent = await fetchRecentUserMessages(
    admin,
    userId,
    scope,
    sinceIso,
  );

  const duplicateKey = normalizeForDuplicateCheck(content);
  const rateError = checkRateAndDuplicates(recent, duplicateKey, nowMs);
  if (rateError) return rateError;

  return { ok: true, content };
}
