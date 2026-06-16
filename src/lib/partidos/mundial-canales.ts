/** Reglas de canal TV México (Azteca 7 en fase de grupos) — ver migration 20260530150000. */
function partidoTieneEquipos(
  localN: string,
  visitN: string,
  eqA: string,
  eqB: string,
): boolean {
  const local = localN.toLowerCase();
  const visit = visitN.toLowerCase();
  const a = eqA.toLowerCase();
  const b = eqB.toLowerCase();
  return (
    (local.includes(a) && visit.includes(b)) ||
    (local.includes(b) && visit.includes(a))
  );
}

const AZTECA_7_PAIRS: Array<[string, string]> = [
  ["Mexico", "South Africa"],
  ["Mexico", "Sud"],
  ["United States", "Paraguay"],
  ["Estados Unidos", "Paraguay"],
  ["Brazil", "Morocco"],
  ["Brasil", "Marruecos"],
  ["Netherlands", "Japan"],
  ["Países Bajos", "Jap"],
  ["Holanda", "Jap"],
  ["Argentina", "Algeria"],
  ["Argentina", "Argelia"],
  ["England", "Croatia"],
  ["Inglaterra", "Croacia"],
  ["Mexico", "Korea"],
  ["Mexico", "Corea"],
  ["Brasil", "Hait"],
  ["Brazil", "Hait"],
  ["Netherlands", "Sweden"],
  ["Países Bajos", "Suecia"],
  ["Holanda", "Suecia"],
  ["Spain", "Saudi"],
  ["Espa", "Arabia"],
  ["Norway", "Senegal"],
  ["Noruega", "Senegal"],
  ["Colombia", "Congo"],
  ["Colombia", "RD Congo"],
  ["Czech", "Mexico"],
  ["Chequia", "Mexico"],
  ["Czech", "México"],
  ["Chequia", "México"],
  ["Ecuador", "Germany"],
  ["Ecuador", "Alemania"],
  ["Uruguay", "Spain"],
  ["Uruguay", "Espa"],
  ["Panama", "England"],
  ["Panam", "Inglaterra"],
  ["Colombia", "Portugal"],
];

export function resolveMundialCanalTransmision(input: {
  fase: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  competenciaPilot?: boolean;
}): "azteca_7" | "vix" | "sin_asignar" {
  if (input.competenciaPilot) return "sin_asignar";

  if (input.fase === "grupos") {
    for (const [a, b] of AZTECA_7_PAIRS) {
      if (
        partidoTieneEquipos(
          input.equipo_local_nombre,
          input.equipo_visitante_nombre,
          a,
          b,
        )
      ) {
        return "azteca_7";
      }
    }
    return "vix";
  }

  if (input.fase !== "grupos") {
    return "vix";
  }

  return "sin_asignar";
}
