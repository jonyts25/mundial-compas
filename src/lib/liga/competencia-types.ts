export type EstadoCompetencia =
  | "activa"
  | "finalizada_anticipada"
  | "finalizada";

export interface CompetenciaLigaState {
  estado: EstadoCompetencia;
  /** Ganador económico (solo quiniela_paga) */
  ganadorId: string | null;
  ganadorNombre: string | null;
  /** Líder global gratuito con más pts que el 1° de paga */
  ganadorMoralId: string | null;
  ganadorMoralNombre: string | null;
  finalizadaAt: string | null;
  ganadorDeposito: {
    clabe: string;
    banco: string;
    titular: string;
  } | null;
}

export interface GanadorHonorContext {
  esGanadorMoral: boolean;
  modo: "activo" | "final";
  ganadorEconomicoNombre: string | null;
}

export interface LiquidacionPagoRow {
  id: string;
  deudor_id: string;
  ganador_id: string;
  estado: "pendiente" | "deposito_reportado" | "confirmado";
  deposito_reportado_at: string | null;
  confirmado_at: string | null;
  deudor_nombre: string;
  deudor_avatar: string | null;
}
