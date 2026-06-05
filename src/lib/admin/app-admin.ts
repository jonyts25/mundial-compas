/**
 * Admin de plataforma (superadmin) — NO confundir con owner/admin de un grupo privado.
 *
 * MVP: lista de UUIDs en `APP_MODERATOR_USER_IDS` (Railway / .env.local).
 * Futuro: tabla `app_platform_admins` si hace falta gestionar desde BD.
 */

export function getAppAdminUserIdsFromEnv(): string[] {
  const raw = process.env.APP_MODERATOR_USER_IDS?.trim();
  if (!raw) return [];
  return raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

/** ¿Es admin de la plataforma (superadmin)? */
export function isAppAdmin(userId: string): boolean {
  return getAppAdminUserIdsFromEnv().includes(userId);
}

export function assertAppAdmin(userId: string): void {
  if (!isAppAdmin(userId)) {
    throw new Error("No autorizado: solo administradores de plataforma");
  }
}
