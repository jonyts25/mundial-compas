export type NarradorId = "martinoli" | "perro" | "dr_garcia" | "vaca";

export interface FraseGolTemplate {
  narrador: NarradorId;
  nombreVisible: string;
  /** Placeholders: {local}, {visitante}, {marcador}, {minuto}, {goleador} */
  plantilla: string;
}

export const FRASES_GOL: FraseGolTemplate[] = [
  {
    narrador: "martinoli",
    nombreVisible: "Martinoli (parodia)",
    plantilla:
      "¡GOOOOOOL! {goleador} la manda a guardar. {marcador}. ¡Señoras y señores, esto es fiesta!",
  },
  {
    narrador: "martinoli",
    nombreVisible: "Martinoli (parodia)",
    plantilla:
      "¡Llegó el gol! {local} {marcador} {visitante}. ¡Ay mamá, qué jugada tan bonita!",
  },
  {
    narrador: "perro",
    nombreVisible: "Perro Bermúdez (parodia)",
    plantilla:
      "¡Gooooooooool! ¡Gooooooooool! {goleador} la empuja. Marcador: {marcador}. ¡Así se juega, compadre!",
  },
  {
    narrador: "perro",
    nombreVisible: "Perro Bermúdez (parodia)",
    plantilla:
      "¡Le pegó con alma y vida! {marcador}. El Perro te lo dice: esto se pone bueno.",
  },
  {
    narrador: "dr_garcia",
    nombreVisible: "Dr. García (parodia)",
    plantilla:
      "Diagnóstico: gol confirmado. {goleador} anota al minuto {minuto}. Receta: más fútbol. {marcador}.",
  },
  {
    narrador: "dr_garcia",
    nombreVisible: "Dr. García (parodia)",
    plantilla:
      "El paciente arquero no respondió al tratamiento. {marcador}. Prognóstico: euforia generalizada.",
  },
  {
    narrador: "vaca",
    nombreVisible: "La Vaca (parodia)",
    plantilla:
      "¡Muuuuucho gol! {goleador} la clava. {local} {marcador} {visitante}. ¡A pastar defensas!",
  },
  {
    narrador: "vaca",
    nombreVisible: "La Vaca (parodia)",
    plantilla:
      "¡Gol de ordeña pura! Marcador {marcador}. La Vaca no muge, la Vaca narra.",
  },
];

export interface FraseGolParams {
  local: string;
  visitante: string;
  marcadorLocal: number;
  marcadorVisitante: number;
  minuto?: number | null;
  goleador?: string | null;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function formatMarcador(local: number, visitante: number): string {
  return `${local}-${visitante}`;
}

function applyTemplate(plantilla: string, params: FraseGolParams): string {
  const marcador = formatMarcador(params.marcadorLocal, params.marcadorVisitante);
  return plantilla
    .replaceAll("{local}", params.local)
    .replaceAll("{visitante}", params.visitante)
    .replaceAll("{marcador}", marcador)
    .replaceAll("{minuto}", String(params.minuto ?? "—"))
    .replaceAll("{goleador}", params.goleador ?? "el delantero");
}

/** Genera una frase aleatoria estilo narrador mexicano (parodia). */
export function generarFraseGol(params: FraseGolParams): {
  contenido: string;
  narrador: NarradorId;
  nombreVisible: string;
} {
  const template = pickRandom(FRASES_GOL);
  return {
    contenido: applyTemplate(template.plantilla, params),
    narrador: template.narrador,
    nombreVisible: template.nombreVisible,
  };
}
