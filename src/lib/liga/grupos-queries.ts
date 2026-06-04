import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  maskCodigoInvitacion,
  type RolLiga,
} from "@/lib/liga/roles";
import {
  parseModoCompetenciaFromConfig,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
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
  modo_competencia: ModoCompetencia;
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
    modo_competencia: parseModoCompetenciaFromConfig(liga.configuracion),
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

  let rol: RolLiga | null = membresia?.rol as RolLiga | undefined ?? null;

  if (!rol && liga.creador_id === userId) {
    rol = "owner";
  }

  if (!rol) return null;

  const { data: memberCount } = await supabase.rpc("contar_miembros_liga", {
    p_liga_id: liga.id,
  });

  const base = mapGrupoRow(
    liga as Record<string, unknown>,
    rol,
    Number(memberCount ?? 0),
  );

  return {
    ...base,
    creador_id: liga.creador_id as string | null,
    created_at: liga.created_at as string,
    puede_administrar: rol === "owner" || rol === "admin",
  };
}

function mapMiembroRowsFromRpc(rows: unknown): GrupoMiembroRow[] {
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

function sortMiembros(rows: GrupoMiembroRow[]): GrupoMiembroRow[] {
  const order: Record<RolLiga, number> = { owner: 0, admin: 1, miembro: 2 };
  return [...rows].sort((a, b) => order[a.rol] - order[b.rol]);
}

/** Lista miembros; RPC si existe, si no consulta con service role tras validar membresía. */
export async function fetchGrupoMiembros(
  ligaId: string,
  userId: string,
): Promise<GrupoMiembroRow[]> {
  assertAuthenticatedUserId(userId);

  const userClient = await createClient();
  const { data: rpcData, error: rpcError } = await userClient.rpc(
    "listar_miembros_grupo",
    { p_liga_id: ligaId },
  );

  if (!rpcError && rpcData) {
    const result = rpcData as Record<string, unknown>;
    if (result.ok === false) return [];
    return mapMiembroRowsFromRpc(result.miembros);
  }

  const esMiembro = await assertUsuarioEsMiembro(userId, ligaId);
  if (!esMiembro) return [];

  const admin = createServerDataClient();
  const { data: membresias, error: memError } = await admin
    .from("liga_miembros")
    .select("usuario_id, rol, joined_at")
    .eq("liga_id", ligaId);

  if (memError) throw new Error(memError.message);
  if (!membresias?.length) return [];

  const userIds = membresias.map((m) => m.usuario_id as string);
  const { data: usuarios, error: usrError } = await admin
    .from("usuarios")
    .select("id, nombre_visible")
    .in("id", userIds);

  if (usrError) throw new Error(usrError.message);

  const nombrePorId = new Map(
    (usuarios ?? []).map((u) => [u.id as string, String(u.nombre_visible)]),
  );

  const rows = membresias.map((m) => {
    const rolRaw = m.rol as string;
    const rol: RolLiga =
      rolRaw === "owner" || rolRaw === "admin" ? rolRaw : "miembro";
    return {
      usuario_id: m.usuario_id as string,
      rol,
      nombre_visible: nombrePorId.get(m.usuario_id as string) ?? "Compa",
      joined_at: m.joined_at != null ? String(m.joined_at) : null,
    };
  });

  return sortMiembros(rows);
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
