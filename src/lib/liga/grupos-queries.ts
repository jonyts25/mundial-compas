import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  maskCodigoInvitacion,
  type RolLiga,
} from "@/lib/liga/roles";
import {
  parseTipoQuinielaFromConfig,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";
import { createClient } from "@/lib/supabase/server";
import {
  assertAuthenticatedUserId,
  createServerDataClient,
} from "@/lib/supabase/server-data";

export interface GrupoResumen {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  /** Completo solo para owner/admin; null para miembros normales. */
  codigo_invitacion: string | null;
  tipo_quiniela: TipoQuiniela;
  rol: RolLiga;
  miembros_count: number;
  activa: boolean;
  es_sistema: boolean;
}

export interface GrupoDetalle extends GrupoResumen {
  creador_id: string | null;
  created_at: string;
  puede_administrar: boolean;
}

export interface GrupoMiembroRow {
  usuario_id: string;
  rol: RolLiga;
  nombre_visible: string;
  joined_at: string | null;
}

function mapGrupoRow(
  liga: Record<string, unknown>,
  rol: RolLiga,
  miembrosCount: number,
): GrupoResumen {
  const codigoRaw = String(liga.codigo_invitacion ?? "");
  return {
    id: liga.id as string,
    slug: String(liga.slug),
    nombre: String(liga.nombre),
    descripcion: (liga.descripcion as string | null) ?? null,
    codigo_invitacion: maskCodigoInvitacion(codigoRaw, rol),
    tipo_quiniela: parseTipoQuinielaFromConfig(liga.configuracion),
    rol,
    miembros_count: miembrosCount,
    activa: Boolean(liga.activa),
    es_sistema: Boolean(liga.es_sistema),
  };
}

export async function fetchMisGrupos(userId: string): Promise<GrupoResumen[]> {
  assertAuthenticatedUserId(userId);
  const supabase = createServerDataClient();

  const { data: membresias, error: memError } = await supabase
    .from("liga_miembros")
    .select("liga_id, rol")
    .eq("usuario_id", userId);

  if (memError) throw new Error(memError.message);
  if (!membresias?.length) return [];

  const ligaIds = membresias.map((m) => m.liga_id as string);
  const rolPorLiga = new Map(
    membresias.map((m) => [m.liga_id as string, m.rol as RolLiga]),
  );

  const { data: ligas, error: ligasError } = await supabase
    .from("ligas_privadas")
    .select(
      "id, slug, nombre, descripcion, codigo_invitacion, configuracion, activa, es_sistema",
    )
    .in("id", ligaIds)
    .eq("activa", true)
    .order("nombre", { ascending: true });

  if (ligasError) throw new Error(ligasError.message);

  const privados = (ligas ?? []).filter((l) => !l.es_sistema);
  if (privados.length === 0) return [];

  const counts = await Promise.all(
    privados.map(async (liga) => {
      const { data, error } = await supabase.rpc("contar_miembros_liga", {
        p_liga_id: liga.id,
      });
      if (error) return { id: liga.id as string, count: 0 };
      return { id: liga.id as string, count: Number(data ?? 0) };
    }),
  );
  const countMap = new Map(counts.map((c) => [c.id, c.count]));

  return privados.map((liga) =>
    mapGrupoRow(
      liga as Record<string, unknown>,
      rolPorLiga.get(liga.id as string) ?? "miembro",
      countMap.get(liga.id as string) ?? 0,
    ),
  );
}

export async function fetchGrupoBySlug(
  userId: string,
  slug: string,
): Promise<GrupoDetalle | null> {
  assertAuthenticatedUserId(userId);
  const supabase = createServerDataClient();
  const slugNorm = slug.trim().toLowerCase();

  const { data: liga, error } = await supabase
    .from("ligas_privadas")
    .select(
      "id, slug, nombre, descripcion, codigo_invitacion, configuracion, activa, es_sistema, creador_id, created_at",
    )
    .eq("slug", slugNorm)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!liga || liga.es_sistema) return null;

  const { data: membresia } = await supabase
    .from("liga_miembros")
    .select("rol")
    .eq("liga_id", liga.id)
    .eq("usuario_id", userId)
    .maybeSingle();

  if (!membresia) return null;

  const { data: memberCount } = await supabase.rpc("contar_miembros_liga", {
    p_liga_id: liga.id,
  });

  const base = mapGrupoRow(
    liga as Record<string, unknown>,
    membresia.rol as RolLiga,
    Number(memberCount ?? 0),
  );

  const rol = membresia.rol as RolLiga;

  return {
    ...base,
    creador_id: liga.creador_id as string | null,
    created_at: liga.created_at as string,
    puede_administrar: rol === "owner" || rol === "admin",
  };
}

export async function fetchGrupoMiembros(
  ligaId: string,
): Promise<GrupoMiembroRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("listar_miembros_grupo", {
    p_liga_id: ligaId,
  });

  if (error) throw new Error(error.message);

  const result = data as Record<string, unknown> | null;
  if (!result?.ok) return [];

  const rows = result.miembros;
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const rolRaw = r.rol as string;
    const rol: RolLiga =
      rolRaw === "owner" || rolRaw === "admin" ? rolRaw : "miembro";
    return {
      usuario_id: String(r.usuario_id),
      rol,
      nombre_visible: String(r.nombre_visible ?? "Compa"),
      joined_at: r.joined_at != null ? String(r.joined_at) : null,
    };
  });
}

export async function assertUsuarioEsMiembro(
  userId: string,
  ligaId: string,
): Promise<boolean> {
  if (ligaId === LIGA_GLOBAL_ID) return true;
  const supabase = createServerDataClient();
  const { data, error } = await supabase.rpc("es_miembro_de_liga", {
    p_liga_id: ligaId,
    p_usuario_id: userId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}
