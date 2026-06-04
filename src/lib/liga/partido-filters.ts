import { todayMexicoDate } from "@/lib/datetime/mexico";
import type { TipoQuiniela } from "@/lib/liga/tipo-quiniela";
import type { FaseMundial, Partido } from "@/types/database";

export type PartidoFilterOptions = {
  tipo: TipoQuiniela;
  /** Para por_jornada / por_fase en fases futuras */
  jornada?: number | null;
  fase?: FaseMundial | null;
};

export function filterPartidosPorTipo(
  partidos: Partido[],
  options: PartidoFilterOptions,
): Partido[] {
  const { tipo, jornada, fase } = options;

  switch (tipo) {
    case "express_dia": {
      const hoy = todayMexicoDate();
      return partidos.filter((p) => {
        const d = new Date(p.fecha_kickoff).toLocaleDateString("en-CA", {
          timeZone: "America/Mexico_City",
        });
        return d === hoy;
      });
    }
    case "por_jornada": {
      if (jornada == null) return partidos.filter((p) => p.jornada != null);
      return partidos.filter((p) => p.jornada === jornada);
    }
    case "por_fase": {
      if (!fase) return partidos;
      return partidos.filter((p) => p.fase === fase);
    }
    case "mundial_completo":
    default:
      return partidos;
  }
}
