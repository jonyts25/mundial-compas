import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GroupStandings } from "@/components/standings/GroupStandings";
import {
  getCachedGroupStandings,
  getStandingsRevalidateSeconds,
} from "@/lib/standings/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatCacheHint(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 60) return `actualización cada ~${min} min`;
  const h = Math.round(min / 60);
  return `actualización cada ~${h} h`;
}

export default async function PosicionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/posiciones");
  }

  const cacheSeconds = getStandingsRevalidateSeconds();

  let snapshot;
  try {
    snapshot = await getCachedGroupStandings();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar posiciones";
    return (
      <>
        <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              ←
            </Link>
            <h1 className="text-lg font-bold text-white">Posiciones</h1>
          </div>
        </header>
        <main className="px-4 py-8 pb-24 text-center">
          <p className="text-sm text-red-400">{message}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Verifica API_FOOTBALL_KEY y APIFOOTBALL_LEAGUE_ID=28 en Railway.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-emerald-400">
            ← Inicio
          </Link>
        </main>
        <AppBottomNav />
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white">Posiciones por grupo</h1>
            <p className="text-xs text-zinc-500">
              {snapshot.leagueName ?? "Mundial FIFA"} ·{" "}
              {formatCacheHint(cacheSeconds)}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 pb-28">
        <div className="mb-4 rounded-xl border border-emerald-800/30 bg-emerald-950/20 px-3 py-2.5 text-[11px] text-emerald-200/90">
          <span className="inline-block w-1 rounded-full bg-emerald-500 align-middle">
            &nbsp;
          </span>{" "}
          Franja verde = puestos que avanzan de la fase de grupos (top 2).
        </div>

        <GroupStandings snapshot={snapshot} />

        <p className="mt-4 text-center text-[10px] text-zinc-600">
          Datos vía apifootball.com · caché servidor {formatCacheHint(cacheSeconds)}
        </p>
      </main>

      <AppBottomNav />
    </>
  );
}
