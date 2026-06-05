import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { DisclaimerBlock } from "@/components/legal/DisclaimerBlock";
import { LegalFooterLink } from "@/components/legal/LegalFooterLink";
import { PilotModeBanner } from "@/components/pilot/PilotModeBanner";
import { QuinielaContextBanner } from "@/components/quiniela/QuinielaContextBanner";
import { QuinielaList } from "@/components/quiniela/QuinielaList";
import { QuinielaSelector } from "@/components/quiniela/QuinielaSelector";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { DISCLAIMER_GENERAL, DISCLAIMER_IA } from "@/lib/legal/disclaimers";
import { fetchQuinielaSelectorOptions } from "@/lib/quiniela/selector-options";
import { fetchPilotUiState } from "@/lib/apifootball/pilot-queries";
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

  const [data, competencia, pilot, selectorOptions] = await Promise.all([
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
  ]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white">Mi Quiniela</h1>
            <p className="text-xs text-zinc-500">
              Liga global · honor · gratuita ·{" "}
              <Link href="/grupos" className="text-emerald-500 hover:underline">
                Mis quinielas
              </Link>
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        <QuinielaSelector
          options={selectorOptions}
          activeLigaId={LIGA_GLOBAL_ID}
        />

        <QuinielaContextBanner nombreLiga="Mundial Compas" esGlobal />

        {pilot.showBanner && (
          <PilotModeBanner
            label={pilot.label}
            partidosPilotCount={pilot.partidosPilotCount}
          />
        )}

        <DisclaimerBlock
          title="Quiniela global"
          body="Participación gratuita y de honor. Sin cooperacha ni liquidación en esta liga."
          compact
        />

        <QuinielaList
          partidos={data.partidos}
          pronosticosPorPartido={data.pronosticosPorPartido}
          competenciaFinalizada={competencia.estado !== "activa"}
        />

        <div className="mt-6 space-y-2">
          <DisclaimerBlock title="Aviso" body={DISCLAIMER_GENERAL} compact />
          <DisclaimerBlock title="IA" body={DISCLAIMER_IA} compact />
        </div>
      </main>

      <LegalFooterLink />
      <AppBottomNav />
    </>
  );
}
