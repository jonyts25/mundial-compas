"use server";

import { revalidatePath } from "next/cache";
import { metadataGrupoPrivado } from "@/lib/chat/scopes";
import { validateUserChatMessage } from "@/lib/moderation/validate-user-message";
import { createClient } from "@/lib/supabase/server";

export type GrupoChatActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendGrupoChatMessage(
  ligaId: string,
  grupoSlug: string,
  contenido: string,
): Promise<GrupoChatActionResult> {
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

  const moderation = await validateUserChatMessage(user.id, contenido, {
    kind: "grupo",
    ligaId,
  });
  if (!moderation.ok) {
    return { ok: false, error: moderation.error };
  }
  const text = moderation.content;

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
