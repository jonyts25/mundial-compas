import { notFound, redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GrupoDashboard } from "@/components/grupos/GrupoDashboard";
import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";
import { fetchLeaderboard } from "@/lib/leaderboard/queries";
import {
  fetchGrupoBySlug,
  fetchGrupoMiembros,
} from "@/lib/liga/grupos-queries";
import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";
import { fetchQuinielaData } from "@/lib/quiniela/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const TAB_IDS = [
  "resumen",
  "quiniela",
  "leaderboard",
  "miembros",
  "invitar",
  "configuracion",
] as const;

export default async function GrupoDetallePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tab: tabParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/grupos/${slug}`);

  const grupo = await fetchGrupoBySlug(user.id, slug);
  if (!grupo) notFound();

  if (!grupo.activa) {
    return (
      <>
        <GrupoPageHeader title={grupo.nombre} backHref="/grupos" />
        <main className="px-4 py-8 text-center text-sm text-zinc-400">
          Este grupo ya no está activo.
        </main>
      </>
    );
  }

  const [miembros, quinielaData, leaderboardFilas] = await Promise.all([
    fetchGrupoMiembros(grupo.id),
    fetchQuinielaData(user.id, {
      ligaId: grupo.id,
      tipoQuiniela: grupo.tipo_quiniela,
    }),
    fetchLeaderboard(grupo.id).catch(() => []),
  ]);

  const initialTab =
    tabParam && (TAB_IDS as readonly string[]).includes(tabParam)
      ? tabParam
      : undefined;

  return (
    <>
      <GrupoPageHeader
        title={grupo.nombre}
        subtitle={TIPO_QUINIELA_LABELS[grupo.tipo_quiniela]}
        backHref="/grupos"
      />

      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        <GrupoDashboard
          grupo={grupo}
          slug={slug}
          miembros={miembros}
          currentUserId={user.id}
          quinielaData={quinielaData}
          leaderboardFilas={leaderboardFilas}
          initialTab={initialTab}
        />
      </main>

      <AppBottomNav />
    </>
  );
}
