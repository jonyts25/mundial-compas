import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";
import { LeaderboardSegmentNote } from "@/components/grupos/LeaderboardSegmentNote";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { fetchGrupoBySlug } from "@/lib/liga/grupos-queries";
import { fetchLeaderboard } from "@/lib/leaderboard/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function GrupoLeaderboardPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/grupos/${slug}/leaderboard`);

  const grupo = await fetchGrupoBySlug(user.id, slug);
  if (!grupo || !grupo.activa) notFound();

  let filas;
  try {
    filas = await fetchLeaderboard(grupo.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar";
    return (
      <>
        <GrupoPageHeader title="Leaderboard" backHref={`/grupos/${slug}`} />
        <main className="px-4 py-8 text-center text-sm text-red-400">
          {message}
        </main>
      </>
    );
  }

  const miFila = filas.find((f) => f.usuario_id === user.id);

  return (
    <>
      <GrupoPageHeader
        title={`Liderato · ${grupo.nombre}`}
        subtitle="3 pts exacto · 1 pt tendencia"
        backHref={`/grupos/${slug}`}
      />

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

        <LeaderboardSegmentNote />

        <Leaderboard filas={filas} usuarioActualId={user.id} />

        {filas.length === 0 && (
          <p className="mt-4 text-center text-sm text-zinc-500">
            Aún no hay puntos. Guarda pronósticos en la quiniela del grupo.
          </p>
        )}

        <p className="mt-4 text-center text-xs text-zinc-600">
          <Link
            href={`/grupos/${slug}/quiniela`}
            className="text-emerald-500 hover:underline"
          >
            Ir a la quiniela del grupo
          </Link>
        </p>
      </main>

      <AppBottomNav />
    </>
  );
}
