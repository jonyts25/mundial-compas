import type { Partido } from "@/types/database";

const TBD_CODES = new Set(["TBD", "TBD2", "POR_DEFINIR", ""]);

export function isTbdTeamCode(code: string | null | undefined): boolean {
  if (!code) return true;
  return TBD_CODES.has(code.toUpperCase()) || code.toUpperCase().startsWith("TBD");
}

export function isTbdTeamName(name: string | null | undefined): boolean {
  if (!name) return true;
  return /por definir|tbd|equipo por definir/i.test(name);
}

export function isKnockoutPartido(partido: Pick<Partido, "fase">): boolean {
  return partido.fase !== "grupos";
}

/** Both sides have confirmed team codes (not TBD). */
export function areBothTeamsConfirmed(
  partido: Pick<
    Partido,
    "equipo_local_codigo" | "equipo_visitante_codigo" | "equipo_local_nombre" | "equipo_visitante_nombre"
  >,
): boolean {
  return (
    !isTbdTeamCode(partido.equipo_local_codigo) &&
    !isTbdTeamCode(partido.equipo_visitante_codigo) &&
    !isTbdTeamName(partido.equipo_local_nombre) &&
    !isTbdTeamName(partido.equipo_visitante_nombre)
  );
}

/** Quiniela: show match but block prediction until both teams confirmed. */
export function isKnockoutPronosticable(
  partido: Pick<
    Partido,
    "fase" | "equipo_local_codigo" | "equipo_visitante_codigo" | "equipo_local_nombre" | "equipo_visitante_nombre"
  >,
): boolean {
  if (!isKnockoutPartido(partido)) return true;
  return areBothTeamsConfirmed(partido);
}

export function knockoutTeamDisplayLabel(
  nombre: string,
  codigo: string,
): string {
  if (isTbdTeamCode(codigo) || isTbdTeamName(nombre)) {
    if (nombre && !isTbdTeamName(nombre)) return nombre;
    return "Equipo por definir";
  }
  return nombre;
}
