import { createClient } from "@/lib/supabase/server";

export type EstatusEliminacionSolicitud =
  | "pendiente"
  | "aprobada"
  | "rechazada"
  | "cancelada";

export interface EliminacionSolicitudRow {
  id: string;
  liga_id: string;
  solicitado_por: string;
  motivo: string;
  estatus: EstatusEliminacionSolicitud;
  comentario_revision?: string | null;
  revisado_at?: string | null;
  created_at: string;
}

const SOLICITUD_SELECT =
  "id, liga_id, solicitado_por, motivo, estatus, comentario_revision, revisado_at, created_at";

export async function fetchEliminacionSolicitudPendiente(
  ligaId: string,
): Promise<EliminacionSolicitudRow | null> {
  return fetchEliminacionSolicitudReciente(ligaId, "pendiente");
}

/** Última solicitud visible para miembros del grupo (pendiente o rechazada reciente). */
export async function fetchEliminacionSolicitudReciente(
  ligaId: string,
  estatus?: EstatusEliminacionSolicitud,
): Promise<EliminacionSolicitudRow | null> {
  const supabase = await createClient();
  let query = supabase
    .from("grupo_eliminacion_solicitudes")
    .select(SOLICITUD_SELECT)
    .eq("liga_id", ligaId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (estatus) {
    query = query.eq("estatus", estatus);
  } else {
    query = query.in("estatus", ["pendiente", "rechazada"]);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    if (error.message.includes("does not exist")) return null;
    throw new Error(error.message);
  }

  return data as EliminacionSolicitudRow | null;
}
