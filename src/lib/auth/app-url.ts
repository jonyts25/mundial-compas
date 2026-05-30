/**
 * URL pública de la app (producción). Evita que correos de auth apunten a localhost
 * si pediste el reset desde dev o si Supabase tiene Site URL en localhost.
 */
export function getPublicAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return url || null;
}

const INVALID_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "::1"]);

function isInvalidHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return INVALID_HOSTS.has(hostname);
}

function railwayPublicUrl(): string | null {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim().replace(/\/$/, "");
  if (!domain) return null;
  return `https://${domain}`;
}

/** Origen público en route handlers (Railway/Docker suele reportar 0.0.0.0:8080). */
export function getRequestOrigin(request: Request): string {
  const configured = getPublicAppUrl() ?? railwayPublicUrl();
  if (configured) return configured;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  if (forwardedHost && !isInvalidHost(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.trim();
  if (host && !isInvalidHost(host)) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const { origin, hostname } = new URL(request.url);
  if (!isInvalidHost(hostname)) return origin;

  return "http://localhost:3000";
}

/** Origen para redirectTo de Supabase Auth */
export function getAuthRedirectOrigin(fallbackOrigin?: string): string {
  const configured = getPublicAppUrl() ?? railwayPublicUrl();
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
