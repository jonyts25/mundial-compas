import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { LegalFooterLink } from "@/components/legal/LegalFooterLink";
import { PilotModeBanner } from "@/components/pilot/PilotModeBanner";
import { PronosticoFusionBanner } from "@/components/quiniela/PronosticoFusionBanner";
import { QuinielaCompactHeader } from "@/components/quiniela/QuinielaCompactHeader";
import { QuinielaList } from "@/components/quiniela/QuinielaList";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { fetchQuinielaSelectorOptions } from "@/lib/quiniela/selector-options";
import { fetchPronosticoFusionPendientes } from "@/lib/quiniela/fusion-queries";
import { fetchPilotUiState } from "@/lib/api-football/pilot-queries";
import { fetchCompetenciaLiga } from "@/lib/liga/competencia-queries";
import { fetchQuinielaData } from "@/lib/quiniela/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function QuinielaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/quiniela");
  }

  const [data, competencia, pilot, selectorOptions, fusionPendientes] = await Promise.all([
    fetchQuinielaData(user.id),
    fetchCompetenciaLiga().catch(() => ({
      estado: "activa" as const,
      ganadorId: null,
      ganadorNombre: null,
      ganadorMoralId: null,
      ganadorMoralNombre: null,
      finalizadaAt: null,
      ganadorDeposito: null,
    })),
    fetchPilotUiState(),
    fetchQuinielaSelectorOptions(user.id),
    fetchPronosticoFusionPendientes(user.id),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <QuinielaCompactHeader
        nombre="Mundial Compas"
        backHref="/"
        esGlobal
        selectorOptions={selectorOptions}
        activeLigaId={LIGA_GLOBAL_ID}
      />

      <main className="px-4 py-3 pb-28">
        {pilot.showBanner && (
          <PilotModeBanner
            label={pilot.label}
            partidosPilotCount={pilot.partidosPilotCount}
          />
        )}

        <PronosticoFusionBanner pendientes={fusionPendientes} />

        <QuinielaList
          partidos={data.partidos}
          pronosticosPorPartido={data.pronosticosPorPartido}
          competenciaFinalizada={competencia.estado !== "activa"}
        />

        <p className="mt-6 text-center text-[10px] text-zinc-600">
          Quiniela global gratuita · honor ·{" "}
          <Link href="/legal" className="text-zinc-500 hover:underline">
            aviso legal
          </Link>
        </p>
      </main>

      <LegalFooterLink />
      <AppBottomNav />
    </div>
  );
}
