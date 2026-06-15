import { HomePersonalSummaryCard } from "@/components/home/HomePersonalSummaryCard";
import { NextDeadlineCard } from "@/components/home/NextDeadlineCard";
import { PredictionProgressCard } from "@/components/home/PredictionProgressCard";
import type { HomeDashboardData } from "@/lib/home/home-dashboard-queries";

interface HomeEngagementDashboardProps {
  nombre: string;
  dashboard: HomeDashboardData | null;
  error?: string | null;
}

const EMPTY_PROGRESS = { enviados: 0, total: 0, percent: 0 };

export function HomeEngagementDashboard({
  nombre,
  dashboard,
  error,
}: HomeEngagementDashboardProps) {
  const loading = !dashboard && !error;

  if (error) {
    return (
      <section
        className="mb-4 rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-300"
        aria-live="polite"
      >
        No pudimos cargar tu resumen. Intenta recargar la página.
      </section>
    );
  }

  const data = dashboard ?? {
    rank: null,
    profile: null,
    pronosticosEnviados: 0,
    pendientes: 0,
    progress: EMPTY_PROGRESS,
    nextDeadline: null,
  };

  return (
    <div className="mb-4 space-y-3" aria-label="Tu quiniela">
      <HomePersonalSummaryCard
        nombre={nombre}
        rank={data.rank}
        profile={data.profile}
        pronosticosEnviados={data.pronosticosEnviados}
        pendientes={data.pendientes}
        loading={loading}
      />
      <PredictionProgressCard progress={data.progress} loading={loading} />
      <NextDeadlineCard deadline={data.nextDeadline} loading={loading} />
    </div>
  );
}
