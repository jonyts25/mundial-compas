"use server";

import { revalidatePath } from "next/cache";
import { TERMINOS_HONOR_VERSION } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type AcceptHonorTermsResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Aceptación diferida del Contrato de Honor (quiniela de paga).
 * Activa badge 👑 en leaderboard.
 */
export async function acceptHonorTerms(): Promise<AcceptHonorTermsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión" };
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("usuarios")
    .update({
      quiniela_paga: true,
      quiniela_paga_at: now,
      terminos_honor_aceptados_at: now,
      terminos_honor_version: TERMINOS_HONOR_VERSION,
      updated_at: now,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/quiniela");
  revalidatePath("/leaderboard");
  revalidatePath("/");

  return { ok: true };
}
