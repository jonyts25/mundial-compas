import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";

/**
 * UUIDs de moderadores de app (chat global, acuerdo de paga legacy).
 * Railway: APP_MODERATOR_USER_IDS=tu-uuid,otro-uuid
 *
 * Para admin de plataforma (superadmin, solicitudes de eliminación) usar
 * `@/lib/admin/app-admin` — mismo env por MVP, sin mezclar con admin de grupo.
 */
export function getModeratorUserIdsFromEnv(): string[] {
  const raw = process.env.APP_MODERATOR_USER_IDS?.trim();
  if (!raw) return [];
  return raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

export function isModeratorFromEnv(userId: string): boolean {
  return getModeratorUserIdsFromEnv().includes(userId);
}

/** Moderador = env APP_MODERATOR_USER_IDS o rol admin/owner en liga global */
export async function resolveIsModerator(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  if (isModeratorFromEnv(userId)) return true;

  const { data } = await supabase
    .from("liga_miembros")
    .select("rol")
    .eq("liga_id", LIGA_GLOBAL_ID)
    .eq("usuario_id", userId)
    .maybeSingle();

  return data?.rol === "admin" || data?.rol === "owner";
}
