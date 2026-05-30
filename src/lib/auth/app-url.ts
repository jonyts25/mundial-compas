/**
 * URL pública de la app (producción). Evita que correos de auth apunten a localhost
 * si pediste el reset desde dev o si Supabase tiene Site URL en localhost.
 */
export function getPublicAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return url || null;
}

/** Origen para redirectTo de Supabase Auth */
export function getAuthRedirectOrigin(fallbackOrigin?: string): string {
  const configured = getPublicAppUrl();
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return fallbackOrigin ?? "";
}

export function buildAuthCallbackUrl(
  nextPath: string,
  fallbackOrigin?: string,
): string {
  const origin = getAuthRedirectOrigin(fallbackOrigin);
  return `${origin}/callback?next=${encodeURIComponent(nextPath)}`;
}
