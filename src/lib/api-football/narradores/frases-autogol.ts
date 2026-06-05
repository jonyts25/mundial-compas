import type { FraseGolParams, NarradorId } from "@/lib/api-football/narradores/frases-gol";

export interface FraseAutogolParams extends FraseGolParams {
  /** Equipo del jugador que metió el balón en su propia meta. */
  equipoPropio?: string | null;
}

interface FraseAutogolTemplate {
  narrador: NarradorId;
  nombreVisible: string;
  /** Placeholders: {local}, {visitante}, {marcador}, {minuto}, {goleador}, {equipo} */
  plantilla: string;
}

export const FRASES_AUTOGOL: FraseAutogolTemplate[] = [
  {
    narrador: "martinoli",
    nombreVisible: "Martinoli (parodia)",
    plantilla:
      "¡Qué lamentableeeee! {goleador} se la enchufó a su propia portería. {marcador}. ¡Harakiri en vivo y en directo!",
  },
  {
    narrador: "martinoli",
    nombreVisible: "Martinoli (parodia)",
    plantilla:
      "¡AUTOGOL! {equipo} se regala el partido. {goleador} la manda contra. {marcador}. ¡Ay mamá, qué tragedia!",
  },
  {
    narrador: "perro",
    nombreVisible: "Perro Bermúdez (parodia)",
    plantilla:
      "¡Se hicieron el harakiri! {goleador} de {equipo} la enfiestó en su arco. Marcador: {marcador}. ¡Compadre, eso no se hace!",
  },
  {
    narrador: "perro",
    nombreVisible: "Perro Bermúdez (parodia)",
    plantilla:
      "¡Autogol, compadre! {goleador} se la comió con papas. {local} {marcador} {visitante}. El Perro no lo puede creer.",
  },
  {
    narrador: "dr_garcia",
    nombreVisible: "Dr. García (parodia)",
    plantilla:
      "Autodiagnóstico fatal: {goleador} se operó solo al minuto {minuto}. {marcador}. Prognóstico: burla generalizada.",
  },
  {
    narrador: "dr_garcia",
    nombreVisible: "Dr. García (parodia)",
    plantilla:
      "El paciente metió el balón en la meta equivocada. {equipo} en crisis existencial. Receta: terapia grupal. {marcador}.",
  },
  {
    narrador: "vaca",
    nombreVisible: "La Vaca (parodia)",
    plantilla:
      "¡Muuuuuuu qué desastre! {goleador} ordeñó su propia meta. {marcador}. ¡A pastar, pero en la cancha correcta!",
  },
  {
    narrador: "vaca",
    nombreVisible: "La Vaca (parodia)",
    plantilla:
      "¡Autogol de establo! {equipo} se auto-mugió el gol. {goleador} la embarró. {local} {marcador} {visitante}.",
  },
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function formatMarcador(local: number, visitante: number): string {
  return `${local}-${visitante}`;
}

function applyTemplate(plantilla: string, params: FraseAutogolParams): string {
  const marcador = formatMarcador(params.marcadorLocal, params.marcadorVisitante);
  const equipo = params.equipoPropio ?? params.goleador ?? "el equipo";
  return plantilla
    .replaceAll("{local}", params.local)
    .replaceAll("{visitante}", params.visitante)
    .replaceAll("{marcador}", marcador)
    .replaceAll("{minuto}", String(params.minuto ?? "—"))
    .replaceAll("{goleador}", params.goleador ?? "un defensa")
    .replaceAll("{equipo}", equipo);
}

/** Frase jocosa de autogol estilo narrador mexicano (parodia). */
export function generarFraseAutogol(params: FraseAutogolParams): {
  contenido: string;
  narrador: NarradorId;
  nombreVisible: string;
} {
  const template = pickRandom(FRASES_AUTOGOL);
  return {
    contenido: applyTemplate(template.plantilla, params),
    narrador: template.narrador,
    nombreVisible: template.nombreVisible,
  };
}
