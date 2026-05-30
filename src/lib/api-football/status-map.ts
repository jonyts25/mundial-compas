import type { EstatusPartido } from "@/types/database";

export const API_STATUS_TO_ESTATUS: Record<string, EstatusPartido> = {
  NS: "programado",
  TBD: "programado",
  "1H": "en_vivo",
  HT: "medio_tiempo",
  "2H": "en_vivo",
  ET: "en_vivo",
  BT: "medio_tiempo",
  P: "en_vivo",
  FT: "finalizado",
  AET: "finalizado",
  PEN: "finalizado",
  PST: "aplazado",
  CANC: "cancelado",
  ABD: "suspendido",
  SUSP: "suspendido",
  INT: "suspendido",
};

export function mapApiStatus(short: string): EstatusPartido {
  return API_STATUS_TO_ESTATUS[short] ?? "programado";
}
