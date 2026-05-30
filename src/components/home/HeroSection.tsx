import { DatoMamalónCard } from "@/components/home/DatoMamalónCard";
import { LiveMatchesStrip } from "@/components/home/LiveMatchesStrip";
import type { DatoMamalón, Partido } from "@/types/database";

interface HeroSectionProps {
  partidosEnVivo: Partido[];
  datoMamalon: DatoMamalón | null;
}

export function HeroSection({ partidosEnVivo, datoMamalon }: HeroSectionProps) {
  if (partidosEnVivo.length > 0) {
    return <LiveMatchesStrip partidos={partidosEnVivo} />;
  }

  if (datoMamalon) {
    return <DatoMamalónCard dato={datoMamalon} />;
  }

  return (
    <section className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center">
      <p className="text-2xl">⚽</p>
      <p className="mt-2 text-sm font-medium text-zinc-300">
        Sin partidos en vivo ni datos mamalones cargados
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Ejecuta el seed de datos_mamalones o agrega partidos en Supabase.
      </p>
    </section>
  );
}
