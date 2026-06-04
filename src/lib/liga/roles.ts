import { createServerDataClient } from "@/lib/supabase/server-data";

export type RolLiga = "owner" | "admin" | "miembro";

export class LigaRoleError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "no_miembro"
      | "sin_permiso"
      | "requiere_owner" = "sin_permiso",
  ) {
    super(message);
    this.name = "LigaRoleError";
  }
}

export function isOwnerOrAdmin(rol: RolLiga): boolean {
  return rol === "owner" || rol === "admin";
}

export function rolLigaLabel(rol: RolLiga): string {
  switch (rol) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    default:
      return "Miembro";
  }
}

/** Rol del usuario en una liga privada; null si no es miembro. */
export async function getMiRolEnLiga(
  ligaId: string,
  userId: string,
): Promise<RolLiga | null> {
  const supabase = createServerDataClient();
  const { data, error } = await supabase
    .from("liga_miembros")
    .select("rol")
    .eq("liga_id", ligaId)
    .eq("usuario_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.rol) return null;
  const rol = data.rol as string;
  if (rol === "owner" || rol === "admin" || rol === "miembro") return rol;
  return null;
}

export async function assertLigaOwnerOrAdmin(
  ligaId: string,
  userId: string,
): Promise<RolLiga> {
  const rol = await getMiRolEnLiga(ligaId, userId);
  if (!rol) {
    throw new LigaRoleError("No eres miembro de este grupo", "no_miembro");
  }
  if (!isOwnerOrAdmin(rol)) {
    throw new LigaRoleError(
      "Solo el owner o un admin pueden hacer esto",
      "sin_permiso",
    );
  }
  return rol;
}

export async function assertLigaOwner(
  ligaId: string,
  userId: string,
): Promise<RolLiga> {
  const rol = await getMiRolEnLiga(ligaId, userId);
  if (!rol) {
    throw new LigaRoleError("No eres miembro de este grupo", "no_miembro");
  }
  if (rol !== "owner") {
    throw new LigaRoleError("Solo el owner puede hacer esto", "requiere_owner");
  }
  return rol;
}

/** Oculta código de invitación a miembros normales. */
export function maskCodigoInvitacion(
  codigo: string,
  rol: RolLiga | null,
): string | null {
  if (!codigo) return null;
  if (rol && isOwnerOrAdmin(rol)) return codigo;
  return null;
}
