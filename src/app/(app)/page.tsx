import { redirect } from "next/navigation";
import { AdminPlatformCard } from "@/components/admin/AdminPlatformCard";
import { AppHeader } from "@/components/home/AppHeader";
import { CalendarioPartidos } from "@/components/home/CalendarioPartidos";
import { HeroSection } from "@/components/home/HeroSection";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { LegalFooterLink } from "@/components/legal/LegalFooterLink";
import { LiveHomeRefresh } from "@/components/home/LiveHomeRefresh";
import { PilotModeBanner } from "@/components/pilot/PilotModeBanner";
import { fetchPilotUiState } from "@/lib/apifootball/pilot-queries";
import { fetchCalendarioPartidosData } from "@/lib/partidos/calendario-queries";
import { fetchHomePageData } from "@/lib/partidos/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ usuario, partidosEnVivo, datoMamalon }, calendario, pilot] =
    await Promise.all([
      fetchHomePageData(user.id),
      fetchCalendarioPartidosData(user.id),
      fetchPilotUiState(),
    ]);

  return (
    <>
      <LiveHomeRefresh enabled={pilot.showBanner || partidosEnVivo.length > 0} />
      <AppHeader usuario={usuario} />
      <main className="px-4 pb-24 pt-4">
        {pilot.showBanner && (
          <PilotModeBanner
            label={pilot.label}
            partidosPilotCount={pilot.partidosPilotCount}
          />
        )}
        <AdminPlatformCard userId={user.id} />
        <HeroSection partidosEnVivo={partidosEnVivo} datoMamalon={datoMamalon} />
        <CalendarioPartidos
          partidos={calendario.partidos}
          pronosticosGuardados={calendario.pronosticosGuardados}
          diasConPartidos={calendario.diasConPartidos}
          pilotPartidoIds={pilot.pilotPartidoIds}
        />
      </main>
      <LegalFooterLink />
      <AppBottomNav />
    </>
  );
}
