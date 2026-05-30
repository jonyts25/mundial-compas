import type { SupabaseClient } from "@supabase/supabase-js";
import { handleGoalEvent } from "@/lib/api-football/handlers/on-goal";
import { handleStatusEvent } from "@/lib/api-football/handlers/on-status";
import type { ApiFootballWebhookPayload, WebhookHandlerResult } from "@/types/api-football";

export type WebhookEventType = "goal" | "status" | "unknown";

export function resolveEventType(payload: ApiFootballWebhookPayload): WebhookEventType {
  const event = (payload.event ?? payload.type ?? "").toString().toLowerCase();
  if (event.includes("goal") || payload.goal) return "goal";
  if (event.includes("status") || event.includes("fixture")) return "status";
  return "unknown";
}

export async function dispatchWebhookEvent(
  supabase: SupabaseClient,
  partidoId: string,
  payload: ApiFootballWebhookPayload,
): Promise<WebhookHandlerResult> {
  const type = resolveEventType(payload);

  switch (type) {
    case "goal":
      return handleGoalEvent({ supabase, partidoId, payload });
    case "status":
      return handleStatusEvent({ supabase, partidoId, payload });
    default:
      return { ok: true, skipped: true, message: `Evento no manejado: ${type}` };
  }
}
