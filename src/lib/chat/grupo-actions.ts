"use server";

import { revalidatePath } from "next/cache";
import { metadataGrupoPrivado } from "@/lib/chat/scopes";
import { createClient } from "@/lib/supabase/server";

const MAX_LENGTH = 500;

export type GrupoChatActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendGrupoChatMessage(
  ligaId: string,
  grupoSlug: string,
  contenido: string,
): Promise<GrupoChatActionResult> {
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

  const { data: miembro } = await supabase
    .from("liga_miembros")
    .select("rol")
    .eq("liga_id", ligaId)
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!miembro) {
    return { ok: false, error: "No eres miembro de esta quiniela" };
  }

  const { data: liga } = await supabase
    .from("ligas_privadas")
    .select("activa, es_sistema")
    .eq("id", ligaId)
    .maybeSingle();

  if (!liga || liga.es_sistema || !liga.activa) {
    return { ok: false, error: "Este grupo ya no está activo" };
  }

  const { error } = await supabase.from("mensajes_chat").insert({
    partido_id: null,
    liga_id: ligaId,
    usuario_id: user.id,
    tipo: "usuario",
    contenido: text,
    metadata: metadataGrupoPrivado(),
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/grupos/${grupoSlug}`);
  return { ok: true };
}
