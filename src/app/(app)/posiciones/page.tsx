import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GroupTabs } from "@/components/posiciones/GroupTabs";
import { PosicionesLiveRefresh } from "@/components/posiciones/PosicionesLiveRefresh";
import { fetchPosicionesMundialData } from "@/lib/standings/posiciones-queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function sourceLabel(source: string): string {
  switch (source) {
    case "partidos":
      return "Tabla calculada desde partidos en la app (se actualiza con marcadores en vivo).";
    case "api":
      return "Tabla desde apifootball.com (caché). Los partidos abajo vienen de tu base de datos.";
    default:
      return "Tabla desde partidos; respaldo API si aún no hay resultados.";
  }
}

export default async function PosicionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/posiciones");
  }

  let data;
  try {
    data = await fetchPosicionesMundialData();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar";
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
            <h1 className="text-lg font-bold text-white">Grupos del Mundial</h1>
          </div>
        </header>
        <main className="px-4 py-8 pb-24 text-center">
          <p className="text-sm text-red-400">{message}</p>
        </main>
        <AppBottomNav />
      </>
    );
  }

  return (
    <>
      <PosicionesLiveRefresh
        enabled={!data.groupStageComplete}
        pollWhileLive={data.hasLiveGroupMatches}
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
            <h1 className="text-lg font-bold text-white">Grupos del Mundial</h1>
            <p className="text-xs text-zinc-500">
              12 grupos · 2 primeros + 8 mejores terceros a ronda de 32
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 pb-28">
        <div className="mb-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-400">
          Consulta tablas y calendario por grupo. Independiente de quinielas
          globales o privadas. Criterios de desempate según{" "}
          <a
            href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/groups-how-teams-qualify-tie-breakers"
            className="text-emerald-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            FIFA 2026
          </a>
          .
        </div>

        <GroupTabs
          groups={data.snapshot.groups}
          partidosPorGrupo={data.partidosPorGrupo}
          bestThirdPlaces={data.bestThirdPlaces}
          knockoutBracket={data.knockoutBracket}
          dataSourceLabel={sourceLabel(data.source)}
        />
      </main>

      <AppBottomNav />
    </>
  );
}
