import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";
import { QuinielaList } from "@/components/quiniela/QuinielaList";
import { fetchGrupoBySlug } from "@/lib/liga/grupos-queries";
import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";
import { fetchQuinielaData } from "@/lib/quiniela/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function GrupoQuinielaPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/grupos/${slug}/quiniela`);

  const grupo = await fetchGrupoBySlug(user.id, slug);
  if (!grupo || !grupo.activa) notFound();

  const data = await fetchQuinielaData(user.id, {
    ligaId: grupo.id,
    tipoQuiniela: grupo.tipo_quiniela,
  });

  return (
    <>
      <GrupoPageHeader
        title={`Quiniela · ${grupo.nombre}`}
        subtitle={TIPO_QUINIELA_LABELS[grupo.tipo_quiniela]}
        backHref={`/grupos/${slug}`}
      />

      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        <QuinielaList
          partidos={data.partidos}
          pronosticosPorPartido={data.pronosticosPorPartido}
          ligaId={grupo.id}
          tipoQuiniela={grupo.tipo_quiniela}
          emptyHint={
            grupo.tipo_quiniela === "express_dia"
              ? "Hoy no hay partidos programados para el express del día."
              : undefined
          }
        />
        <p className="mt-4 text-center text-xs text-zinc-600">
          Pronósticos solo cuentan en este grupo.{" "}
          <Link href="/quiniela" className="text-emerald-500 hover:underline">
            Quiniela global
          </Link>
        </p>
      </main>

      <AppBottomNav />
    </>
  );
}
