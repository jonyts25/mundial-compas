import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { DisclaimerBlock } from "@/components/legal/DisclaimerBlock";
import { QuinielaCompactHeader } from "@/components/quiniela/QuinielaCompactHeader";
import { KnockoutQuinielaBanner } from "@/components/quiniela/KnockoutQuinielaBanner";
import { PronosticoFusionBanner } from "@/components/quiniela/PronosticoFusionBanner";
import { DISCLAIMER_COOPERACHA } from "@/lib/legal/disclaimers";
import { QuinielaList } from "@/components/quiniela/QuinielaList";
import { QuinielaTipoFilters } from "@/components/quiniela/QuinielaTipoFilters";
import { fetchGrupoBySlug } from "@/lib/liga/grupos-queries";
import { fetchQuinielaFilterOptions } from "@/lib/quiniela/filter-options";
import { fetchQuinielaSelectorOptions } from "@/lib/quiniela/selector-options";
import { fetchQuinielaData } from "@/lib/quiniela/queries";
import { fetchPronosticoFusionPendientes } from "@/lib/quiniela/fusion-queries";
import { createClient } from "@/lib/supabase/server";
import type { FaseMundial } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ jornada?: string; fase?: string }>;
}

function parseJornada(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function parseFase(value: string | undefined): FaseMundial | null {
  const valid: FaseMundial[] = [
    "grupos",
    "dieciseisavos",
    "octavos",
    "cuartos",
    "semifinal",
    "tercer_lugar",
    "final",
  ];
  if (value && valid.includes(value as FaseMundial)) {
    return value as FaseMundial;
  }
  return null;
}

export default async function GrupoQuinielaPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/grupos/${slug}/quiniela`);

  const grupo = await fetchGrupoBySlug(user.id, slug);
  if (!grupo || !grupo.activa) notFound();

  const jornada = parseJornada(sp.jornada);
  const fase = parseFase(sp.fase);

  const [data, selectorOptions, filterOptions, fusionPendientes] = await Promise.all([
    fetchQuinielaData(user.id, {
      ligaId: grupo.id,
      tipoQuiniela: grupo.tipo_quiniela,
      jornada,
      fase,
    }),
    fetchQuinielaSelectorOptions(user.id),
    fetchQuinielaFilterOptions(),
    fetchPronosticoFusionPendientes(user.id, grupo.id),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <QuinielaCompactHeader
        nombre={grupo.nombre}
        backHref={`/grupos/${slug}`}
        esGlobal={false}
        tipoQuiniela={grupo.tipo_quiniela}
        modoCompetencia={grupo.modo_competencia}
        selectorOptions={selectorOptions}
        activeLigaId={grupo.id}
        grupoSlug={slug}
      />

      <main className="px-4 py-3 pb-28">
        {grupo.modo_competencia === "cooperacion" && (
          <DisclaimerBlock title="Cooperacha" body={DISCLAIMER_COOPERACHA} compact />
        )}

        <Suspense fallback={null}>
          <QuinielaTipoFilters
            tipoQuiniela={grupo.tipo_quiniela}
            filterOptions={filterOptions}
            jornadaActual={jornada}
            faseActual={fase}
          />
        </Suspense>

        <KnockoutQuinielaBanner />

        <PronosticoFusionBanner pendientes={fusionPendientes} />

        <QuinielaList
          partidos={data.partidos}
          pronosticosPorPartido={data.pronosticosPorPartido}
          ligaId={grupo.id}
          tipoQuiniela={grupo.tipo_quiniela}
          emptyHint={
            grupo.tipo_quiniela === "express_dia"
              ? "Hoy no hay partidos programados para el express del día."
              : grupo.tipo_quiniela === "por_jornada" && jornada != null
                ? `No hay partidos abiertos en la jornada ${jornada}.`
                : grupo.tipo_quiniela === "por_fase" && fase
                  ? `No hay partidos abiertos en ${fase}.`
                  : undefined
          }
        />
      </main>

      <AppBottomNav />
    </div>
  );
}
