import type { PitonisoLabInput } from "@/lib/ai/pitoniso-lab-types";

/** Reglas anti-invención compartidas para prompts deportivos (solo redactar con input). */
export const AI_SPORTS_PROMPT_GUARDRAILS = `REGLAS ESTRICTAS (prioridad máxima):
- Usa ÚNICAMENTE los datos del input. No completes con conocimiento general ni memoria del modelo.
- Si falta un dato, di exactamente "no tengo esa señal".
- PROHIBIDO mencionar estadio, sede o venue si match.venue no viene en el input.
- PROHIBIDO mencionar ciudad si match.city no viene en el input.
- PROHIBIDO mencionar jugadores, entrenadores o árbitros si no vienen en el input.
- PROHIBIDO mencionar historial, H2H, récords o antecedentes si no vienen en el input.
- PROHIBIDO inventar estadísticas, porcentajes, goles o resultados pasados.
- No asegures ganador ni resultado. No lenguaje de apuesta.
- Tono divertido, breve y responsable.
- Siempre incluye disclaimer corto de entretenimiento.
- Responde SOLO JSON válido (sin markdown ni texto extra).`;

const VENUE_PATTERNS = [
  /\bestadio\b/i,
  /\bazteca\b/i,
  /\barena\b/i,
  /\bsede\b/i,
  /\bplantel\b/i,
  /\brugir[aá]\b/i,
  /\bcoliseo\b/i,
];

const CITY_PATTERNS = [/\bciudad\b/i, /\bmonterrey\b/i, /\bguadalajara\b/i];

/** Detecta menciones prohibidas cuando venue/city no están en input (smoke / QA). */
export function detectSportsContentHallucinations(
  text: string,
  input: Pick<PitonisoLabInput, "match">,
): string[] {
  const violations: string[] = [];
  const hasVenue = Boolean(input.match.venue?.trim());
  const hasCity = Boolean(input.match.city?.trim());

  if (!hasVenue) {
    for (const pattern of VENUE_PATTERNS) {
      if (pattern.test(text)) {
        violations.push("menciona estadio/sede sin match.venue en input");
        break;
      }
    }
  }

  if (!hasCity) {
    for (const pattern of CITY_PATTERNS) {
      if (pattern.test(text)) {
        violations.push("menciona ciudad sin match.city en input");
        break;
      }
    }
  }

  return violations;
}

export function formatMatchBlock(input: PitonisoLabInput): string {
  const { match } = input;
  const lines = [
    `Local: ${match.home}`,
    `Visitante: ${match.away}`,
    match.kickoff ? `Kickoff: ${match.kickoff}` : null,
    match.venue ? `Venue: ${match.venue}` : "Venue: no tengo esa señal",
    match.city ? `Ciudad: ${match.city}` : "Ciudad: no tengo esa señal",
  ].filter(Boolean);
  return lines.join("\n");
}
