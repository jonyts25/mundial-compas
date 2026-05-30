import type { CanalTransmision, EstatusPartido, FaseMundial } from "@/types/database";

const FASE_LABELS: Record<FaseMundial, string> = {
  grupos: "Fase de grupos",
  dieciseisavos: "Dieciseisavos",
  octavos: "Octavos de final",
  cuartos: "Cuartos de final",
  semifinal: "Semifinal",
  tercer_lugar: "Tercer lugar",
  final: "Final",
};

const ESTATUS_LABELS: Record<EstatusPartido, string> = {
  programado: "Programado",
  en_vivo: "En vivo",
  medio_tiempo: "Medio tiempo",
  finalizado: "Finalizado",
  suspendido: "Suspendido",
  aplazado: "Aplazado",
  cancelado: "Cancelado",
};

export function labelFase(fase: FaseMundial): string {
  return FASE_LABELS[fase] ?? fase;
}

export function labelEstatus(estatus: EstatusPartido): string {
  return ESTATUS_LABELS[estatus] ?? estatus;
}

export function isPartidoEnVivo(estatus: EstatusPartido): boolean {
  return estatus === "en_vivo" || estatus === "medio_tiempo";
}

export interface CanalDisplay {
  label: string;
  className: string;
  sublabel?: string;
}

export function getCanalDisplay(canal: CanalTransmision): CanalDisplay {
  switch (canal) {
    case "azteca_7":
      return {
        label: "Azteca 7",
        className: "bg-green-600 text-white ring-green-400/50",
      };
    case "vix":
      return {
        label: "ViX",
        className: "bg-violet-600 text-white ring-violet-400/50",
      };
    case "azteca_7_y_vix":
      return {
        label: "Azteca 7 + ViX",
        className: "bg-gradient-to-r from-green-600 to-violet-600 text-white",
        sublabel: "Doble transmisión",
      };
    default:
      return {
        label: "Por confirmar",
        className: "bg-zinc-700 text-zinc-300 ring-zinc-600/50",
      };
  }
}
