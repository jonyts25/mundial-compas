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
import { fetchGrupoChatHistorial } from "@/lib/chat/grupo-queries";
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
  "chat",
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

  let grupo;
  try {
    grupo = await fetchGrupoBySlug(user.id, slug);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar la quiniela";
    return (
      <>
        <GrupoPageHeader title="Quiniela privada" backHref="/grupos" />
        <main className="px-4 py-8 pb-24 text-center">
          <p className="text-sm text-red-400">{message}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Si acabas de crear la quiniela, aplica las migraciones Supabase pendientes
            (desde 20260601120000 hasta 20260605120000).
          </p>
        </main>
        <AppBottomNav />
      </>
    );
  }

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

  let miembros: Awaited<ReturnType<typeof fetchGrupoMiembros>> = [];
  let quinielaData: Awaited<ReturnType<typeof fetchQuinielaData>>;
  let leaderboardFilas: Awaited<ReturnType<typeof fetchLeaderboard>> = [];
  let chatMensajes: Awaited<ReturnType<typeof fetchGrupoChatHistorial>> = [];
  let usuarioChat: {
    id: string;
    nombre_visible: string;
    avatar_url: string | null;
    quiniela_paga: boolean;
  } | null = null;

  try {
    const { data: usuarioRow } = await supabase
      .from("usuarios")
      .select("id, nombre_visible, avatar_url, quiniela_paga")
      .eq("id", user.id)
      .single();

    if (!usuarioRow) throw new Error("Perfil no encontrado");
    usuarioChat = usuarioRow;

    [miembros, quinielaData, leaderboardFilas, chatMensajes] =
      await Promise.all([
        fetchGrupoMiembros(grupo.id, user.id),
        fetchQuinielaData(user.id, {
          ligaId: grupo.id,
          tipoQuiniela: grupo.tipo_quiniela,
        }),
        fetchLeaderboard(grupo.id).catch(() => []),
        fetchGrupoChatHistorial(
          grupo.id,
          grupo.puede_administrar,
        ).catch(() => []),
      ]);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar datos";
    return (
      <>
        <GrupoPageHeader title={grupo.nombre} backHref="/grupos" />
        <main className="px-4 py-8 pb-24 text-center">
          <p className="text-sm text-red-400">{message}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Slug: {slug} · Revisa migraciones Supabase (quinielas privadas).
          </p>
        </main>
        <AppBottomNav />
      </>
    );
  }

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
          chatMensajes={chatMensajes}
          usuario={usuarioChat}
          initialTab={initialTab}
        />
      </main>

      <AppBottomNav />
    </>
  );
}
