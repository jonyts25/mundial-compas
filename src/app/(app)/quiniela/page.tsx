import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GanadorHonorMensaje } from "@/components/quiniela/GanadorHonorMensaje";
import { AcuerdoPagoInformativo } from "@/components/quiniela/AcuerdoPagoInformativo";
import { ModeradorAcuerdoPanel } from "@/components/admin/ModeradorAcuerdoPanel";
import { QuinielaHonorBanner } from "@/components/quiniela/QuinielaHonorBanner";
import { resolveIsModerator } from "@/lib/auth/moderator";
import { fetchAcuerdoPago } from "@/lib/liga/fetch-acuerdo-pago";
import { PilotModeBanner } from "@/components/pilot/PilotModeBanner";
import { QuinielaList } from "@/components/quiniela/QuinielaList";
import { fetchPilotUiState } from "@/lib/apifootball/pilot-queries";
import { TablonLiquidacion } from "@/components/quiniela/TablonLiquidacion";
import { fetchLeaderboard } from "@/lib/leaderboard/queries";
import {
  evaluarGanadorInalcanzable,
  fetchCompetenciaLiga,
  fetchLiquidacionPagos,
  resolveGanadorHonorContext,
} from "@/lib/liga/competencia-queries";
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

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("quiniela_paga")
    .eq("id", user.id)
    .single();

  const quinielaPaga = Boolean(perfil?.quiniela_paga);

  try {
    await evaluarGanadorInalcanzable();
  } catch {
    /* RPC tras migración freemium */
  }

  const esModerador = await resolveIsModerator(supabase, user.id);

  const [data, competencia, pagos, leaderboard, acuerdoPago, pilot] = await Promise.all([
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
    quinielaPaga ? fetchLiquidacionPagos().catch(() => []) : Promise.resolve([]),
    fetchLeaderboard().catch(() => []),
    fetchAcuerdoPago(),
    fetchPilotUiState(),
  ]);

  const honorCtx = resolveGanadorHonorContext(
    user.id,
    leaderboard,
    competencia,
    quinielaPaga,
  );

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
              Liga global ·{" "}
              <Link href="/grupos" className="text-emerald-500 hover:underline">
                Mis grupos
              </Link>
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        {pilot.showBanner && (
          <PilotModeBanner
            label={pilot.label}
            partidosPilotCount={pilot.partidosPilotCount}
          />
        )}
        {esModerador && <ModeradorAcuerdoPanel acuerdoActual={acuerdoPago} />}

        <AcuerdoPagoInformativo acuerdo={acuerdoPago} />

        <QuinielaHonorBanner quinielaPaga={quinielaPaga} acuerdoPago={acuerdoPago} />

        <GanadorHonorMensaje
          visible={honorCtx.esGanadorMoral}
          modo={honorCtx.modo}
          ganadorEconomicoNombre={honorCtx.ganadorEconomicoNombre}
        />

        <TablonLiquidacion
          competencia={competencia}
          pagos={pagos}
          usuarioId={user.id}
          quinielaPaga={quinielaPaga}
        />

        <QuinielaList
          partidos={data.partidos}
          pronosticosPorPartido={data.pronosticosPorPartido}
          competenciaFinalizada={competencia.estado !== "activa"}
        />
      </main>

      <AppBottomNav />
    </>
  );
}
