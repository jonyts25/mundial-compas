import { assertAppAdmin } from "@/lib/admin/app-admin";
import { createServerDataClient } from "@/lib/supabase/server-data";
import type { EstatusEliminacionSolicitud } from "@/lib/liga/eliminacion-solicitudes";

export interface SolicitudEliminacionAdminRow {
  id: string;
  liga_id: string;
  liga_slug: string;
  liga_nombre: string;
  liga_activa: boolean;
  solicitado_por: string;
  solicitante_nombre: string;
  motivo: string;
  estatus: EstatusEliminacionSolicitud;
  comentario_revision: string | null;
  revisado_por: string | null;
  revisado_at: string | null;
  created_at: string;
}

export async function countSolicitudesEliminacionPendientes(): Promise<number> {
  const admin = createServerDataClient();
  const { count, error } = await admin
    .from("grupo_eliminacion_solicitudes")
    .select("id", { count: "exact", head: true })
    .eq("estatus", "pendiente");

  if (error) {
    if (error.message.includes("does not exist")) return 0;
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function fetchSolicitudesEliminacionAdmin(
  appAdminUserId: string,
): Promise<SolicitudEliminacionAdminRow[]> {
  assertAppAdmin(appAdminUserId);
  const admin = createServerDataClient();

  const { data: solicitudes, error } = await admin
    .from("grupo_eliminacion_solicitudes")
    .select(
      "id, liga_id, solicitado_por, motivo, estatus, comentario_revision, revisado_por, revisado_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!solicitudes?.length) return [];

  const ligaIds = [...new Set(solicitudes.map((s) => s.liga_id as string))];
  const userIds = [
    ...new Set(
      solicitudes.flatMap((s) => [
        s.solicitado_por as string,
        s.revisado_por as string | null,
      ]),
    ),
  ].filter(Boolean) as string[];

  const [{ data: ligas }, { data: usuarios }] = await Promise.all([
    admin
      .from("ligas_privadas")
      .select("id, slug, nombre, activa")
      .in("id", ligaIds),
    admin
      .from("usuarios")
      .select("id, nombre_visible")
      .in("id", userIds),
  ]);

  const ligaPorId = new Map(
    (ligas ?? []).map((l) => [
      l.id as string,
      {
        slug: String(l.slug),
        nombre: String(l.nombre),
        activa: Boolean(l.activa),
      },
    ]),
  );
  const nombrePorId = new Map(
    (usuarios ?? []).map((u) => [u.id as string, String(u.nombre_visible)]),
  );

  return solicitudes.map((s) => {
    const liga = ligaPorId.get(s.liga_id as string);
    return {
      id: s.id as string,
      liga_id: s.liga_id as string,
      liga_slug: liga?.slug ?? "—",
      liga_nombre: liga?.nombre ?? "Quiniela",
      liga_activa: liga?.activa ?? false,
      solicitado_por: s.solicitado_por as string,
      solicitante_nombre:
        nombrePorId.get(s.solicitado_por as string) ?? "Compa",
      motivo: s.motivo as string,
      estatus: s.estatus as EstatusEliminacionSolicitud,
      comentario_revision: (s.comentario_revision as string | null) ?? null,
      revisado_por: (s.revisado_por as string | null) ?? null,
      revisado_at: (s.revisado_at as string | null) ?? null,
      created_at: s.created_at as string,
    };
  });
}
