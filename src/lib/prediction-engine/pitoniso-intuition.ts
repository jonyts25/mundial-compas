/**
 * Intuición narrativa de El Pitoniso — determinista por partidoId.
 * No altera el veredicto del motor; solo enriquece copy.
 */

export type IntuitionSignal =
  | "sorpresa"
  | "empate_travieso"
  | "favorito_firme"
  | "tarde_movida"
  | "cerrado_al_final";

const INTUITION_TONES: IntuitionSignal[] = [
  "sorpresa",
  "empate_travieso",
  "favorito_firme",
  "tarde_movida",
  "cerrado_al_final",
];

function hashPartidoId(partidoId: string): number {
  let hash = 5381;
  for (let i = 0; i < partidoId.length; i += 1) {
    hash = (hash * 33) ^ partidoId.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Misma partidoId → misma intuición en cada visita. */
export function intuitionSeed(partidoId: string): IntuitionSignal {
  const index = hashPartidoId(partidoId) % INTUITION_TONES.length;
  return INTUITION_TONES[index]!;
}

export function intuitionCopy(
  signal: IntuitionSignal,
  favoriteName: string,
): string {
  switch (signal) {
    case "sorpresa":
      return "El Pitoniso huele una sorpresa en el aire — el Mundial no lee los papeles.";
    case "empate_travieso":
      return "Algo le dice que el empate puede colarse cuando menos lo esperas.";
    case "favorito_firme":
      return `La intuición del Pitoniso apunta a **${favoriteName}**, pero sin prometer nada.`;
    case "tarde_movida":
      return "Le late que el partido se decida en los minutos finales.";
    case "cerrado_al_final":
      return "Lo ve cerrado: cualquier detalle puede inclinar la balanza.";
  }
}
