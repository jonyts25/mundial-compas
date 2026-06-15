import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { LegalFooterLink } from "@/components/legal/LegalFooterLink";
import { AnalyticsViewTracker } from "@/components/analytics/AnalyticsViewTracker";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { UserStyleCard } from "@/components/leaderboard/UserStyleCard";
import { fetchUserProfile } from "@/lib/insights/profile-data";
import { fetchLeaderboard } from "@/lib/leaderboard/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/leaderboard");
  }

  let filas;
  let profile = null;
  try {
    [filas, profile] = await Promise.all([
      fetchLeaderboard(),
      fetchUserProfile(user.id).catch(() => null),
    ]);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar";
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-red-400">{message}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Aplica la migración tabla_liderato en Supabase si aún no lo hiciste.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-emerald-400">
          ← Inicio
        </Link>
      </div>
    );
  }

  const miFila = filas.find((f) => f.usuario_id === user.id);

  return (
    <>
      <AnalyticsViewTracker
        event="leaderboard_viewed"
        properties={{ liga_scope: "global" }}
      />
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white">Tabla de liderato</h1>
            <p className="text-xs text-zinc-500">
              Liga global · honor · 3 pts exacto · 1 pt tendencia
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 pb-28">
        {miFila && (
          <div className="mb-4 rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/90">
              Tu posición
            </p>
            <p className="mt-1 font-mono text-2xl font-black text-emerald-300">
              {miFila.posicion}°
              <span className="ml-2 text-base font-semibold text-zinc-400">
                · {miFila.puntos_totales} pts
              </span>
            </p>
          </div>
        )}

        {profile && (
          <UserStyleCard profile={profile} ligaScope="global" />
        )}

        <Leaderboard
          filas={filas}
          usuarioActualId={user.id}
          mostrarBadgeQuinielaPaga={false}
        />

        <p className="mt-4 text-center text-[10px] text-zinc-600">
          Desempate: más exactos → más tendencias → antigüedad en la liga
        </p>
      </main>

      <LegalFooterLink />
      <AppBottomNav />
    </>
  );
}
