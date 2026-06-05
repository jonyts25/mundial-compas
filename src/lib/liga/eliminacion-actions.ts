"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SolicitarEliminacionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function solicitarEliminacionGrupo(
  ligaId: string,
  grupoSlug: string,
  motivo: string,
): Promise<SolicitarEliminacionResult> {
  const text = motivo.trim();
  if (text.length < 10) {
    return { ok: false, error: "El motivo debe tener al menos 10 caracteres" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Inicia sesión" };

  const { error } = await supabase.rpc("solicitar_eliminacion_grupo", {
    p_liga_id: ligaId,
    p_motivo: text,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/grupos/${grupoSlug}`);
  return { ok: true };
}
