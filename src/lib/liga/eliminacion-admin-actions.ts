"use server";

import { revalidatePath } from "next/cache";
import { assertAppAdmin } from "@/lib/admin/app-admin";
import { createClient } from "@/lib/supabase/server";
import { createServerDataClient } from "@/lib/supabase/server-data";

export type RevisarSolicitudResult =
  | { ok: true }
  | { ok: false; error: string };

async function getAdminUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sesión");
  assertAppAdmin(user.id);
  return user.id;
}

export async function aprobarSolicitudEliminacion(
  solicitudId: string,
  comentarioRevision?: string,
): Promise<RevisarSolicitudResult> {
  try {
    const adminUserId = await getAdminUserId();
    const admin = createServerDataClient();

    const { data: solicitud, error: fetchError } = await admin
      .from("grupo_eliminacion_solicitudes")
      .select("id, liga_id, estatus")
      .eq("id", solicitudId)
      .maybeSingle();

    if (fetchError || !solicitud) {
      return { ok: false, error: "Solicitud no encontrada" };
    }
    if (solicitud.estatus !== "pendiente") {
      return { ok: false, error: "La solicitud ya fue revisada" };
    }

    const now = new Date().toISOString();
    const comentario = comentarioRevision?.trim() || null;

    const { error: solError } = await admin
      .from("grupo_eliminacion_solicitudes")
      .update({
        estatus: "aprobada",
        revisado_por: adminUserId,
        revisado_at: now,
        comentario_revision: comentario,
      })
      .eq("id", solicitudId);

    if (solError) return { ok: false, error: solError.message };

    const { data: liga } = await admin
      .from("ligas_privadas")
      .select("slug")
      .eq("id", solicitud.liga_id)
      .maybeSingle();

    const { error: ligaError } = await admin
      .from("ligas_privadas")
      .update({ activa: false, updated_at: now })
      .eq("id", solicitud.liga_id);

    if (ligaError) return { ok: false, error: ligaError.message };

    revalidatePath("/admin");
    revalidatePath("/admin/solicitudes-eliminacion");
    revalidatePath("/grupos");
    revalidatePath("/");
    if (liga?.slug) {
      revalidatePath(`/grupos/${liga.slug}`);
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al aprobar",
    };
  }
}

export async function rechazarSolicitudEliminacion(
  solicitudId: string,
  comentarioRevision?: string,
): Promise<RevisarSolicitudResult> {
  try {
    const adminUserId = await getAdminUserId();
    const admin = createServerDataClient();

    const { data: solicitud, error: fetchError } = await admin
      .from("grupo_eliminacion_solicitudes")
      .select("id, liga_id, estatus")
      .eq("id", solicitudId)
      .maybeSingle();

    if (fetchError || !solicitud) {
      return { ok: false, error: "Solicitud no encontrada" };
    }
    if (solicitud.estatus !== "pendiente") {
      return { ok: false, error: "La solicitud ya fue revisada" };
    }

    const now = new Date().toISOString();

    const { error } = await admin
      .from("grupo_eliminacion_solicitudes")
      .update({
        estatus: "rechazada",
        revisado_por: adminUserId,
        revisado_at: now,
        comentario_revision: comentarioRevision?.trim() || null,
      })
      .eq("id", solicitudId);

    if (error) return { ok: false, error: error.message };

    const { data: liga } = await admin
      .from("ligas_privadas")
      .select("slug")
      .eq("id", solicitud.liga_id)
      .maybeSingle();

    revalidatePath("/admin");
    revalidatePath("/admin/solicitudes-eliminacion");
    if (liga?.slug) revalidatePath(`/grupos/${liga.slug}`);

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al rechazar",
    };
  }
}
