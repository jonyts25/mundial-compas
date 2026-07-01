import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispatchPushForNotifications,
  type NotificationRow,
  type PushDispatchStats,
} from "@/lib/push/send";

const DEFAULT_BATCH_SIZE = 80;

export type DrainPendingResult = PushDispatchStats & {
  fetched: number;
};

/** Reintenta Web Push para filas en notificaciones con enviada = false. */
export async function drainPendingPushNotifications(
  supabase: SupabaseClient,
  limit = DEFAULT_BATCH_SIZE,
): Promise<DrainPendingResult> {
  const { data: rows, error } = await supabase
    .from("notificaciones")
    .select("id, usuario_id, titulo, cuerpo, partido_id")
    .eq("enviada", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[push] drain fetch error:", error.message);
    return { fetched: 0, sent: 0, failed: 0, skipped: 0 };
  }

  if (!rows?.length) {
    return { fetched: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const stats = await dispatchPushForNotifications(
    supabase,
    rows as NotificationRow[],
  );

  return { fetched: rows.length, ...stats };
}
