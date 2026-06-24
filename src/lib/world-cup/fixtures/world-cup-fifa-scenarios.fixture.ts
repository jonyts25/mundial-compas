import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";

function p(
  id: string,
  home: string,
  homeName: string,
  away: string,
  awayName: string,
  hl: number,
  av: number,
  grupo: string,
  estatus: PartidoGrupoRow["estatus"] = "finalizado",
): PartidoGrupoRow {
  return {
    id,
    fase: "grupos",
    grupo,
    equipo_local_codigo: home,
    equipo_visitante_codigo: away,
    equipo_local_nombre: homeName,
    equipo_visitante_nombre: awayName,
    marcador_local: hl,
    marcador_visitante: av,
    estatus,
  };
}

/**
 * Grupo A — México vs Corea con desempate por enfrentamiento directo.
 * México 1-0 Corea (FT). Corea gana vs Sudáfrica en vivo 1-0 → empatan a 6 pts
 * pero México mantiene 1.º por head_to_head_points.
 */
export function buildMexicoKoreaHeadToHeadFixtures(): PartidoGrupoRow[] {
  return [
    p("a1", "MEX", "México", "KOR", "Corea del Sur", 1, 0, "A"),
    p("a2", "MEX", "México", "RSA", "Sudáfrica", 2, 0, "A"),
    p("a3", "KOR", "Corea del Sur", "CZE", "Chequia", 2, 0, "A"),
    p("a4", "RSA", "Sudáfrica", "CZE", "Chequia", 1, 0, "A"),
    p("a5", "KOR", "Corea del Sur", "RSA", "Sudáfrica", 1, 0, "A", "en_vivo"),
    p("a6", "CZE", "Chequia", "MEX", "México", 0, 0, "A", "programado"),
  ];
}

/** Estado anterior: Corea 0-0 Sudáfrica en vivo — México líder cómodo. */
export function buildMexicoKoreaBeforeLiveGoal(): PartidoGrupoRow[] {
  return [
    p("a1", "MEX", "México", "KOR", "Corea del Sur", 1, 0, "A"),
    p("a2", "MEX", "México", "RSA", "Sudáfrica", 2, 0, "A"),
    p("a3", "KOR", "Corea del Sur", "CZE", "Chequia", 2, 0, "A"),
    p("a4", "RSA", "Sudáfrica", "CZE", "Chequia", 1, 0, "A"),
    p("a5", "KOR", "Corea del Sur", "RSA", "Sudáfrica", 0, 0, "A", "en_vivo"),
    p("a6", "CZE", "Chequia", "MEX", "México", 0, 0, "A", "programado"),
  ];
}

/** Grupo E — Chequia como tercero que compite por mejores terceros. */
export function buildCzechThirdPlaceFixtures(): PartidoGrupoRow[] {
  return [
    p("e1", "E1", "Líder E", "E2", "Segundo E", 2, 0, "E"),
    p("e2", "E3", "Tercero E", "E4", "Cuarto E", 1, 1, "E"),
    p("e3", "CZE", "Chequia", "E4", "Cuarto E", 2, 1, "E", "en_vivo"),
    ...buildMinimalGroupsExceptE(),
  ];
}

/** Grupos mínimos A–L para activar Annex C (8 mejores terceros definidos). */
function buildMinimalGroupsExceptE(): PartidoGrupoRow[] {
  const rows: PartidoGrupoRow[] = [];
  const letters = "ABCDEFGHIJKL".split("");
  for (const letter of letters) {
    if (letter === "E") continue;
    rows.push(
      p(`${letter}1`, `${letter}1`, `${letter}1`, `${letter}2`, `${letter}2`, 2, 0, letter),
      p(`${letter}3`, `${letter}3`, `${letter}3`, `${letter}4`, `${letter}4`, 1, 0, letter),
    );
  }
  return rows;
}

/** Sudáfrica cae del podio de mejores terceros tras derrota. */
export function buildSouthAfricaThirdDropBefore(): PartidoGrupoRow[] {
  return [
    ...buildMexicoKoreaBeforeLiveGoal(),
    p("f1", "RSA", "Sudáfrica", "F2", "Rival F", 1, 0, "F"),
    p("f2", "F3", "Tercero F", "F4", "Cuarto F", 0, 2, "F"),
    ...buildMinimalGroupsExceptE().filter((r) => r.grupo !== "A" && r.grupo !== "F"),
  ];
}

export function buildSouthAfricaThirdDropAfter(): PartidoGrupoRow[] {
  return [
    ...buildMexicoKoreaHeadToHeadFixtures(),
    p("f1", "RSA", "Sudáfrica", "F2", "Rival F", 0, 2, "F", "en_vivo"),
    p("f2", "F3", "Tercero F", "F4", "Cuarto F", 0, 2, "F"),
    ...buildMinimalGroupsExceptE().filter((r) => r.grupo !== "A" && r.grupo !== "F"),
  ];
}
