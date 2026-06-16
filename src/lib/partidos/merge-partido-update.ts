import { getTeamStorageCode } from "@/lib/utils";
import type { CanalTransmision } from "@/types/database";

type PartidoCatalogFields = {
  fase?: string;
  grupo?: string | null;
  jornada?: number | null;
  equipo_local_codigo?: string;
  equipo_visitante_codigo?: string;
  equipo_local_nombre?: string;
  equipo_visitante_nombre?: string;
  canal_transmision?: CanalTransmision | string;
  sede?: string | null;
  metadata?: Record<string, unknown>;
};

function codesFromNames(localName?: string, awayName?: string) {
  return {
    equipo_local_codigo: localName ? getTeamStorageCode(localName) : undefined,
    equipo_visitante_codigo: awayName ? getTeamStorageCode(awayName) : undefined,
  };
}

/**
 * Fusiona un patch de API con fila existente: no pisa grupo/canal/jornada
 * salvo que el incoming traiga datos mejores.
 */
export function mergePartidoCatalogUpdate<T extends PartidoCatalogFields>(
  existing: PartidoCatalogFields,
  incoming: T,
): T {
  const nameCodes = codesFromNames(
    incoming.equipo_local_nombre ?? existing.equipo_local_nombre,
    incoming.equipo_visitante_nombre ?? existing.equipo_visitante_nombre,
  );

  const incomingCanal = incoming.canal_transmision;
  const existingCanal = existing.canal_transmision;

  return {
    ...incoming,
    grupo: incoming.grupo ?? existing.grupo ?? null,
    jornada: incoming.jornada ?? existing.jornada ?? null,
    fase: incoming.fase ?? existing.fase,
    sede: incoming.sede ?? existing.sede ?? null,
    equipo_local_codigo: nameCodes.equipo_local_codigo ?? existing.equipo_local_codigo,
    equipo_visitante_codigo:
      nameCodes.equipo_visitante_codigo ?? existing.equipo_visitante_codigo,
    canal_transmision:
      incomingCanal && incomingCanal !== "sin_asignar"
        ? incomingCanal
        : existingCanal && existingCanal !== "sin_asignar"
          ? existingCanal
          : incomingCanal ?? existingCanal ?? "sin_asignar",
    metadata: {
      ...(typeof existing.metadata === "object" && existing.metadata !== null
        ? existing.metadata
        : {}),
      ...(incoming.metadata ?? {}),
    },
  };
}
