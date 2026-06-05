import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { trackEventServer } from "@/lib/analytics/track";
import { getRequestOrigin } from "@/lib/auth/app-url";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const origin = getRequestOrigin(request);

  if (code) {
    const cookieStore = await cookies();
    const redirectUrl = `${origin}${next}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      trackEventServer("user_signed_in", {});
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
