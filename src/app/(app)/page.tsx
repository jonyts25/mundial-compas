import { WhatsNewModal } from "@/components/product/WhatsNewModal";
import { PublicLandingPage } from "@/components/landing/PublicLandingPage";
import { AdminPlatformCard } from "@/components/admin/AdminPlatformCard";
import { AppHeader } from "@/components/home/AppHeader";
import { CalendarioPartidos } from "@/components/home/CalendarioPartidos";
import { HeroSection } from "@/components/home/HeroSection";
import { OnboardingStartCard } from "@/components/home/OnboardingStartCard";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { LegalFooterLink } from "@/components/legal/LegalFooterLink";
import { LiveHomeRefresh } from "@/components/home/LiveHomeRefresh";
import { PilotModeBanner } from "@/components/pilot/PilotModeBanner";
import { fetchPilotUiState } from "@/lib/apifootball/pilot-queries";
import { fetchOnboardingUserState } from "@/lib/onboarding/state";
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
    return <PublicLandingPage />;
  }

  const [
    { usuario, partidosEnVivo, datoMamalon },
    calendario,
    pilot,
    onboarding,
  ] = await Promise.all([
    fetchHomePageData(user.id),
    fetchCalendarioPartidosData(user.id),
    fetchPilotUiState(),
    fetchOnboardingUserState(user.id),
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
        <OnboardingStartCard eligible={onboarding.eligible} />
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
      <WhatsNewModal />
    </>
  );
}
