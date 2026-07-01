import type { EstatusPartido } from "@/types/database";

/** Sincroniza fecha_kickoff desde API solo en partidos aún no iniciados. */
export function shouldSyncKickoffFromApi(
  estatus: EstatusPartido,
  storedKickoffIso: string,
  apiKickoffIso: string,
): boolean {
  if (estatus !== "programado" && estatus !== "aplazado") return false;
  const stored = new Date(storedKickoffIso).getTime();
  const api = new Date(apiKickoffIso).getTime();
  if (!Number.isFinite(stored) || !Number.isFinite(api)) return false;
  return Math.abs(stored - api) > 60_000;
}
