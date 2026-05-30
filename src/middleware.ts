import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Rutas sin sesión Supabase — cada una valida su propia auth (webhook, admin secret, etc.) */
const SKIP_AUTH_PREFIXES = [
  "/login",
  "/callback",
  "/recuperar-contrasena",
  "/actualizar-contrasena",
  "/api/webhooks",
  "/api/admin",
];

function skipsAuthRedirect(pathname: string): boolean {
  return SKIP_AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabaseResponse, user } = await updateSession(request);

  if (skipsAuthRedirect(pathname)) {
    if (user && pathname === "/login") {
      const next = request.nextUrl.searchParams.get("next") ?? "/";
      return NextResponse.redirect(new URL(next, request.url));
    }
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
