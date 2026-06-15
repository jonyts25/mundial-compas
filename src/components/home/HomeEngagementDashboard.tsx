import { HomePersonalSummaryCard } from "@/components/home/HomePersonalSummaryCard";
import type { HomeDashboardData } from "@/lib/home/home-dashboard-queries";

interface HomeEngagementDashboardProps {
  nombre: string;
  dashboard: HomeDashboardData | null;
  error?: string | null;
}

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
    </div>
  );
}
