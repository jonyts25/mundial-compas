/** Configuración del fin de semana de prueba (api-sports). Solo servidor. */

export interface PilotConfig {
  enabled: boolean;
  from: string;
  to: string;
  label: string;
}

function trimOptional(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

function defaultPilotWeekend(): { from: string; to: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setUTCDate(now.getUTCDate() + daysUntilSaturday);
  const sun = new Date(sat);
  sun.setUTCDate(sat.getUTCDate() + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(sat), to: fmt(sun) };
}

export function getPilotConfig(): PilotConfig {
  const enabled =
    trimOptional("PILOT_MODE_ENABLED")?.toLowerCase() === "true" ||
    trimOptional("API_SPORTS_PILOT_ENABLED")?.toLowerCase() === "true";

  const defaults = defaultPilotWeekend();

  return {
    enabled,
    from: trimOptional("API_SPORTS_PILOT_FROM") ?? defaults.from,
    to: trimOptional("API_SPORTS_PILOT_TO") ?? defaults.to,
    label:
      trimOptional("API_SPORTS_PILOT_LABEL") ??
      "Fin de semana de prueba — api-sports",
  };
}

export function isPilotPartidoMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const m = metadata as Record<string, unknown>;
  return m.competencia === "pilot" || m.pilot === true;
}

export function filterOutPilotPartidos<T extends { metadata?: unknown }>(
  partidos: T[],
): T[] {
  return partidos.filter((p) => !isPilotPartidoMetadata(p.metadata));
}
