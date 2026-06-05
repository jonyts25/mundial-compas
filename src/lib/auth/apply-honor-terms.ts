/**
 * @deprecated Flujo quiniela_paga global. `applyPendingHonorTermsIfAny` solo limpia localStorage.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { TERMINOS_HONOR_VERSION } from "@/lib/constants";

export const PENDING_HONOR_TERMS_KEY = "mundial-compas:pending-honor-terms";

export interface PendingHonorTerms {
  quinielaPaga: boolean;
  version: string;
}

export function savePendingHonorTerms(pending: PendingHonorTerms): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_HONOR_TERMS_KEY, JSON.stringify(pending));
}

export function readPendingHonorTerms(): PendingHonorTerms | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PENDING_HONOR_TERMS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingHonorTerms;
  } catch {
    return null;
  }
}

export function clearPendingHonorTerms(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_HONOR_TERMS_KEY);
}

export async function applyHonorTermsToProfile(
  supabase: SupabaseClient,
  userId: string,
  quinielaPaga: boolean,
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("usuarios")
    .update({
      terminos_honor_aceptados_at: now,
      terminos_honor_version: TERMINOS_HONOR_VERSION,
      quiniela_paga: quinielaPaga,
      quiniela_paga_at: quinielaPaga ? now : null,
      updated_at: now,
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function applyPendingHonorTermsIfAny(
  _supabase: SupabaseClient,
  _userId: string,
): Promise<void> {
  const pending = readPendingHonorTerms();
  if (!pending) return;
  // No activar quiniela_paga en global; descartar pendiente legacy.
  clearPendingHonorTerms();
}
