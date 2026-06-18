/**
 * Frases estilo narradores icónicos de LATAM y España (parodia / homenaje).
 * No están afiliadas a cadenas ni personas reales — solo el “vibe” para el chat.
 */

import {
  PLANTILLAS_FIN_MEXICO_EXTRA,
  PLANTILLAS_GOL_MEXICO_EXTRA,
  PLANTILLAS_INICIO_MEXICO_EXTRA,
  PLANTILLAS_MEDIO_MEXICO_EXTRA,
  PLANTILLAS_MEDIO_SIN_GOLES_MEXICO_EXTRA,
  PLANTILLAS_ROJA_MEXICO_EXTRA,
  PLANTILLAS_SEGUNDO_TIEMPO_MEXICO_EXTRA,
} from "@/lib/narracion/comentaristas-mexico";

export type RegionNarracion =
  | "mexico"
  | "argentina"
  | "colombia"
  | "chile"
  | "uruguay"
  | "espana"
  | "brasil"
  | "peru"
  | "general";

export interface PlantillaNarracion {
  region: RegionNarracion;
  /** Ej. "Perro Bermúdez (parodia)" */
  estilo: string;
  plantilla: string;
}

export interface ParamsGol {
  local: string;
  visitante: string;
  marcadorLocal: number;
  marcadorVisitante: number;
  goleador: string;
  equipo: string;
  minuto?: number | null;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
}

function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 1) return items[0]!;
  const index =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(1))[0]! % items.length
      : Math.floor(Math.random() * items.length);
  return items[index]!;
}

function marcador(local: number, visitante: number): string {
  return `${local}-${visitante}`;
}

function apply(
  plantilla: string,
  p: {
    local: string;
    visitante: string;
    marcador: string;
    goleador: string;
    equipo: string;
    minuto: string;
    extra: string;
    campeon?: string;
    detalle_penales?: string;
  },
): string {
  return plantilla
    .replaceAll("{local}", p.local)
    .replaceAll("{visitante}", p.visitante)
    .replaceAll("{marcador}", p.marcador)
    .replaceAll("{goleador}", p.goleador)
    .replaceAll("{equipo}", p.equipo)
    .replaceAll("{minuto}", p.minuto)
    .replaceAll("{extra}", p.extra)
    .replaceAll("{campeon}", p.campeon ?? "")
    .replaceAll("{detalle_penales}", p.detalle_penales ?? "");
}

// --- Gol (plantillas con contexto del partido) ---

export const PLANTILLAS_GOL: readonly PlantillaNarracion[] = [
  // México
  {
    region: "mexico",
    estilo: "Perro Bermúdez (parodia)",
    plantilla:
      "¡Gooooooooool! ¡Gooooooooool! {goleador} la empuja con alma y vida{extra}. Marcador {marcador}. ¡Así se juega, compadre!",
  },
  {
    region: "mexico",
    estilo: "Perro Bermúdez (parodia)",
    plantilla:
      "¡Le pegó con el alma! {equipo} celebra. {marcador} al minuto {minuto}. El Perro te lo dice: esto se pone bueno.",
  },
  {
    region: "mexico",
    estilo: "Christian Martinoli (parodia)",
    plantilla:
      "¡GOOOOOOL! {goleador} la manda a guardar{extra}. {marcador}. ¡Señoras y señores, esto es fiesta total!",
  },
  {
    region: "mexico",
    estilo: "Christian Martinoli (parodia)",
    plantilla:
      "¡Síííí, señores! ¡Gol de {equipo}! {goleador} la define. Marcador {marcador}. ¡Ay mamá, qué jugada tan bonita!",
  },
  {
    region: "mexico",
    estilo: "Luis García (parodia)",
    plantilla:
      "¡La voló! ¡La voló! {goleador} la clava{extra}. {local} {marcador} {visitante}. ¡Qué golazo, no inventen!",
  },
  {
    region: "mexico",
    estilo: "Luis García (parodia)",
    plantilla:
      "Metió la pierna izquierda y la mandó al fondo. Gol de {goleador}. Marcador {marcador} al {minuto}.",
  },
  {
    region: "mexico",
    estilo: "César Mulé Cantor (parodia)",
    plantilla:
      "¡Gooooooooool! ¡Gooooooooool de {equipo}! {goleador} anota{extra}. Marcador {marcador}. ¡No te lo pierdas!",
  },
  {
    region: "mexico",
    estilo: "José Ramón Fernández (parodia)",
    plantilla:
      "¡Gol! ¡Gol legítimo! {goleador} con la frente en alto{extra}. {marcador}. Aquí no hay discusión… bueno, siempre hay.",
  },
  {
    region: "mexico",
    estilo: "José Ramón Fernández (parodia)",
    plantilla:
      "¡Penaaaaal!… no, ¡gol! {goleador} la enchufa{extra}. Marcador {marcador}. El Profe lo vio clarito.",
  },
  {
    region: "mexico",
    estilo: "Dr. García (parodia)",
    plantilla:
      "Diagnóstico: gol confirmado. {goleador} anota al {minuto}{extra}. Receta: más fútbol. Marcador {marcador}.",
  },
  {
    region: "mexico",
    estilo: "La Vaca (parodia)",
    plantilla:
      "¡Muuuuucho gol! {goleador} la clava{extra}. {marcador}. La Vaca no muge, la Vaca narra.",
  },
  ...PLANTILLAS_GOL_MEXICO_EXTRA,
  // Argentina
  {
    region: "argentina",
    estilo: "Relator argentino clásico (parodia)",
    plantilla:
      "¡Gol, gol, gol, goooooool! {goleador} grita el nombre de su barrio{extra}. {marcador} al {minuto}.",
  },
  {
    region: "argentina",
    estilo: "Relator argentino clásico (parodia)",
    plantilla:
      "¡Para el barrio donde creció! {goleador} la mete{extra}. {local} {marcador} {visitante}.",
  },
  {
    region: "argentina",
    estilo: "Claudio Borghi (parodia)",
    plantilla:
      "¡Qué golazo, papá! {goleador} la pone donde quiere{extra}. Marcador {marcador}. ¡Esto es el Mundial!",
  },
  {
    region: "argentina",
    estilo: "Vittor Hugo Morales (parodia)",
    plantilla:
      "¡Gooooooooool! ¡Gooooooooool! {equipo} marca{extra}. {goleador} no perdona. Marcador {marcador}.",
  },
  {
    region: "argentina",
    estilo: "Marcelo Araujo (parodia)",
    plantilla:
      "¡Gol! ¡Gol! ¡Gol! {goleador} define con categoría{extra}. {marcador}. ¡La pelota hace lo que quiere!",
  },
  // Colombia
  {
    region: "colombia",
    estilo: "Jorge Valero Castañeda (parodia)",
    plantilla:
      "¡Gol de mi vida, gol de mi corazón! {goleador} la manda a guardar{extra}. Marcador {marcador}.",
  },
  {
    region: "colombia",
    estilo: "Jorge Valero Castañeda (parodia)",
    plantilla:
      "¡Ese balón tiene dueño! {goleador} anota por {equipo}{extra}. {marcador} al minuto {minuto}.",
  },
  {
    region: "colombia",
    estilo: "Carlos Antonio Vélez (parodia)",
    plantilla:
      "¡Gol! ¡Qué manera de llegar! {goleador} la enchufa{extra}. Marcador {marcador}. El fútbol es así.",
  },
  // Chile
  {
    region: "chile",
    estilo: "Víctor Aravena (parodia)",
    plantilla:
      "¡Gol! ¡Gol! ¡Gol de {equipo}! {goleador} la celebra{extra}. Marcador {marcador}. ¡Qué emoción!",
  },
  {
    region: "chile",
    estilo: "Fernando Solabarrieta (parodia)",
    plantilla:
      "¡Gooooooooool! {goleador} la define{extra}. {local} {marcador} {visitante}. ¡Se prendió la mecha!",
  },
  // Uruguay
  {
    region: "uruguay",
    estilo: "Relator uruguayo (parodia)",
    plantilla:
      "¡Gol de {equipo}! {goleador} la mete con garra charrúa{extra}. Marcador {marcador}.",
  },
  // España
  {
    region: "espana",
    estilo: "José María García (parodia)",
    plantilla:
      "¡Gooooooooool! ¡Qué barbaridad! {goleador} marca{extra}. Marcador {marcador}. ¡Ha marcado, señoras y señores!",
  },
  {
    region: "espana",
    estilo: "José María García (parodia)",
    plantilla:
      "¡Madre mía, qué golazo! {goleador} la clava{extra}. {local} {marcador} {visitante}.",
  },
  {
    region: "espana",
    estilo: "Andrés Montes (parodia)",
    plantilla:
      "¡Tikitaka y gol! {goleador} la enchufa{extra}. Marcador {marcador}. ¡Me mojé entero!",
  },
  {
    region: "espana",
    estilo: "Andrés Montes (parodia)",
    plantilla:
      "¡Qué jugada más rica! {goleador} define{extra}. {marcador}. ¡Esto es poesía con balón!",
  },
  {
    region: "espana",
    estilo: "Manuel Lama (parodia)",
    plantilla:
      "¡Gol! {goleador} la manda dentro{extra}. Marcador {marcador}. ¡Vaya latigazo!",
  },
  {
    region: "espana",
    estilo: "Michael Robinson (parodia)",
    plantilla:
      "¡Qué fenomenal golazo! {goleador} la pone donde quiere{extra}. {marcador}. Very nice, very nice.",
  },
  // Brasil (vibe para audiencia latina)
  {
    region: "brasil",
    estilo: "Galvão Bueno (parodia)",
    plantilla:
      "¡Tá lá dentro! {goleador} marca{extra}. Marcador {marcador}. ¡Es un desastre… o una fiesta, según tu quiniela!",
  },
  {
    region: "brasil",
    estilo: "Galvão Bueno (parodia)",
    plantilla:
      "¡Gol! ¡É gol! {goleador} no perdona{extra}. {local} {marcador} {visitante}. ¡Uma rede dançante!",
  },
  // Perú
  {
    region: "peru",
    estilo: "Narrador peruano (parodia)",
    plantilla:
      "¡Gol! ¡Gol! {goleador} la manda al fondo{extra}. Marcador {marcador}. ¡La olla explota!",
  },
  // General / app
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla:
      "¡Tiemblen compas! {goleador} anota por {equipo}{extra}. Marcador {marcador}. ¡A cobrar la quiniela!",
  },
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla:
      "¡Se prendió el Azteca! {goleador} la define{extra}. {marcador} al {minuto}.",
  },
];

export const PLANTILLAS_ROJA: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "José Ramón Fernández (parodia)",
    plantilla: "¡Expulsión! ¡Expulsión! {goleador} se va{extra}. ¡El Profe lo advirtió!",
  },
  {
    region: "mexico",
    estilo: "Perro Bermúdez (parodia)",
    plantilla: "¡A bañarse temprano! {goleador} vio la roja{extra}. ¡Le sacaron el cuchillo!",
  },
  ...PLANTILLAS_ROJA_MEXICO_EXTRA,
  {
    region: "argentina",
    estilo: "Relator argentino (parodia)",
    plantilla: "¡Roja! ¡Se va! {goleador} al vestuario{extra}. ¡Con diez se complica todo!",
  },
  {
    region: "espana",
    estilo: "Andrés Montes (parodia)",
    plantilla: "¡Hasta aquí llegó el viaje! {goleador} expulsado{extra}. ¡Qué barbaridad!",
  },
  {
    region: "colombia",
    estilo: "Castañeda (parodia)",
    plantilla: "¡Adiós, crack! {goleador} se marcha{extra}. El VAR no perdona.",
  },
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla: "🟥 {goleador} · {equipo}{extra}. ¡El chat se prende!",
  },
];

export const PLANTILLAS_INICIO: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Perro Bermúdez (parodia)",
    plantilla: "¡Arranca el partido! {local} vs {visitante}. ¡A pronosticar en vivo, compadres!",
  },
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla: "¡Pitazo inicial! {local} y {visitante} a la cancha. ¡Señoras y señores, que empiece la fiesta!",
  },
  {
    region: "argentina",
    estilo: "Relator argentino (parodia)",
    plantilla: "¡Rueda la pelota! {local} contra {visitante}. ¡A gritar gol con la banda!",
  },
  {
    region: "espana",
    estilo: "García (parodia)",
    plantilla: "¡Comienza el partido! {local} vs {visitante}. ¡Qué barbaridad de ambiente!",
  },
  {
    region: "colombia",
    estilo: "Castañeda (parodia)",
    plantilla: "¡Sale el balón! {local} y {visitante} buscan la gloria. ¡Gol de mi vida, que empiece!",
  },
  ...PLANTILLAS_INICIO_MEXICO_EXTRA,
];

export const PLANTILLAS_MEDIO_TIEMPO: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla: "¡Medio tiempo! A hidratarse y revisar la quiniela. {marcador} en el marcador.",
  },
  {
    region: "espana",
    estilo: "Montes (parodia)",
    plantilla: "¡Al descanso! {marcador}. ¿Quién la tenía bien? Me mojé de la emoción.",
  },
  {
    region: "argentina",
    estilo: "Borghi (parodia)",
    plantilla: "¡45 minutos! Marcador {marcador}. El drama continúa, papá.",
  },
  ...PLANTILLAS_MEDIO_MEXICO_EXTRA,
];

export const PLANTILLAS_MEDIO_TIEMPO_SIN_GOLES: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¡Medio tiempo! 0-0. Partido cerrado… por ahora. ¡La segunda mitad explota, señoras y señores!",
  },
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla: "⏸️ 0-0 al descanso. ¿Te la jugaste al empate? Respira, falta la segunda.",
  },
  ...PLANTILLAS_MEDIO_SIN_GOLES_MEXICO_EXTRA,
];

export const PLANTILLAS_VAR_GOL_ANULADO: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¡NOOO! El VAR dice que no hay gol de {goleador}. ¡Se borró del marcador! Queda {marcador}.",
  },
  {
    region: "mexico",
    estilo: "Perro Bermúdez (parodia)",
    plantilla:
      "¡Mentira, compadre! Anularon el gol de {goleador}. Marcador {marcador}. El VAR se puso serio.",
  },
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla:
      "🤖 VAR: gol de {goleador} cancelado. Marcador corregido: {marcador}. ¡Ni modo, compas!",
  },
  {
    region: "espana",
    estilo: "García (parodia)",
    plantilla:
      "¡Fuera de juego milimétrico! Se cae el gol de {goleador}. {marcador}. ¡Qué drama!",
  },
];

export const PLANTILLAS_REGULATION_END: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¡Se acabaron los 90! {local} {marcador} {visitante}. Empate: ¡viene tiempo extra, no se vayan!",
  },
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla:
      "Fin del tiempo reglamentario: {marcador}. Empate en eliminatoria — ¡habrá tiempo extra!",
  },
];

export const PLANTILLAS_SEGUNDO_TIEMPO: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla: "¡Arranca el segundo tiempo! {local} {marcador} {visitante}. ¡A remontar la quiniela!",
  },
  {
    region: "espana",
    estilo: "Montes (parodia)",
    plantilla: "¡Segunda parte en marcha! Marcador {marcador}. ¡Que siga el show!",
  },
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla: "¡Segundo tiempo! {local} {marcador} {visitante}. ¿Quién la tiene bien?",
  },
  ...PLANTILLAS_SEGUNDO_TIEMPO_MEXICO_EXTRA,
];

export const PLANTILLAS_FIN: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Perro Bermúdez (parodia)",
    plantilla: "¡Final del partido! Marcador {marcador}. ¡A contar puntos en el liderato!",
  },
  {
    region: "espana",
    estilo: "García (parodia)",
    plantilla: "¡Pitazo final! {marcador}. Se acabó, señoras y señores. ¡Qué barbaridad de partido!",
  },
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla: "¡Se acabó! Marcador final {marcador}. Gracias por acompañar en el chat.",
  },
  ...PLANTILLAS_FIN_MEXICO_EXTRA,
];

export const PLANTILLAS_CAMPEON: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Perro Bermúdez (parodia)",
    plantilla:
      "¡{campeon} es campeón! Marcador {marcador}{detalle_penales}. ¡Se nos eriza la piel, compadres! ¡Así se escribe la historia!",
  },
  {
    region: "argentina",
    estilo: "Ruggeri (parodia)",
    plantilla:
      "¡Levanten las manos! {campeon} lo logró. {marcador}{detalle_penales}. ¡Dale dale dale, campeón!",
  },
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¡Señoras y señores! {campeon} levanta la copa. {local} {marcador} {visitante}{detalle_penales}. ¿Quién es tu daddy? ¡El campeón!",
  },
  {
    region: "colombia",
    estilo: "Castro (parodia)",
    plantilla:
      "¡Gol de la gloria colectiva! {campeon} es campeón. Marcador {marcador}{detalle_penales}. ¡Qué manera de cerrar la noche!",
  },
  {
    region: "espana",
    estilo: "García (parodia)",
    plantilla:
      "¡Pitazo final y corona para {campeon}! {marcador}{detalle_penales}. Se acabó, señoras y señores. ¡Qué barbaridad de final!",
  },
  {
    region: "general",
    estilo: "VAR Compas",
    plantilla:
      "¡Campeón: {campeon}! Marcador final {marcador}{detalle_penales}. Gracias por vivirlo con nosotros en el chat.",
  },
];

/** Frases cortas sueltas (fallback si no hay plantilla con datos) */
export const FRASES_GOL_CORTAS = [
  "¡Tiemblen compas!",
  "¡A cobrar la quiniela!",
  "¡Qué golazo, no inventen!",
  "¡Síííí, señores!",
  "¡La voló!",
  "¡Gol de mi vida!",
  "¡LET'S GOOO!",
  "¿Quién es tu daddy?",
  "¡Gooooooooooool!",
  "¡Con alma y vida!",
  "¡Así se juega, compadre!",
  "¡Qué barbaridad!",
] as const;

export function generarNarracionGol(params: ParamsGol): {
  texto: string;
  estilo: string;
  region: RegionNarracion;
} {
  const extraParts: string[] = [];
  if (params.isPenalty) extraParts.push(" (penal)");
  if (params.isOwnGoal) extraParts.push(" (autogol)");
  const extra = extraParts.join("");

  const p = {
    local: params.local,
    visitante: params.visitante,
    marcador: marcador(params.marcadorLocal, params.marcadorVisitante),
    goleador: params.goleador,
    equipo: params.equipo,
    minuto: params.minuto != null ? `${params.minuto}'` : "—",
    extra,
  };

  const tpl = pickRandom(PLANTILLAS_GOL);
  return {
    texto: apply(tpl.plantilla, p),
    estilo: tpl.estilo,
    region: tpl.region,
  };
}

export function generarNarracionGolAnulado(params: {
  goleador: string | null;
  marcadorLocal: number;
  marcadorVisitante: number;
}): { texto: string; estilo: string } {
  const goleador = params.goleador?.trim() || "el jugador";
  const tpl = pickRandom(PLANTILLAS_VAR_GOL_ANULADO);
  return {
    texto: apply(tpl.plantilla, {
      local: "",
      visitante: "",
      marcador: marcador(params.marcadorLocal, params.marcadorVisitante),
      goleador,
      equipo: "",
      minuto: "—",
      extra: "",
    }),
    estilo: tpl.estilo,
  };
}

export function generarNarracionRoja(params: {
  jugador: string;
  equipo: string;
  minuto?: number | null;
}): { texto: string; estilo: string } {
  const extra = params.minuto != null ? ` (${params.minuto}')` : "";
  const tpl = pickRandom(PLANTILLAS_ROJA);
  return {
    texto: apply(tpl.plantilla, {
      local: "",
      visitante: "",
      marcador: "",
      goleador: params.jugador,
      equipo: params.equipo,
      minuto: String(params.minuto ?? "—"),
      extra,
    }),
    estilo: tpl.estilo,
  };
}

export function generarNarracionFase(
  plantillas: readonly PlantillaNarracion[],
  local: string,
  visitante: string,
  marcadorStr?: string,
): { texto: string; estilo: string } {
  const tpl = pickRandom(plantillas);
  return {
    texto: apply(tpl.plantilla, {
      local,
      visitante,
      marcador: marcadorStr ?? "",
      goleador: "",
      equipo: "",
      minuto: "—",
      extra: "",
    }),
    estilo: tpl.estilo,
  };
}

type PenaltyScorePair = { home: number; away: number };

export function generarNarracionCampeon(params: {
  local: string;
  visitante: string;
  marcadorLocal: number;
  marcadorVisitante: number;
  penaltyScores?: PenaltyScorePair | null;
}): { texto: string; estilo: string } {
  const marcadorStr = marcador(params.marcadorLocal, params.marcadorVisitante);
  let campeon = "";
  let detallePenales = "";

  if (params.penaltyScores) {
    const { home, away } = params.penaltyScores;
    if (home !== away) {
      campeon = home > away ? params.local : params.visitante;
      detallePenales = ` (${campeon} gana ${home}-${away} en penales)`;
    }
  } else if (params.marcadorLocal !== params.marcadorVisitante) {
    campeon =
      params.marcadorLocal > params.marcadorVisitante
        ? params.local
        : params.visitante;
  }

  const tpl = pickRandom(PLANTILLAS_CAMPEON);
  return {
    texto: apply(tpl.plantilla, {
      local: params.local,
      visitante: params.visitante,
      marcador: marcadorStr,
      goleador: "",
      equipo: "",
      minuto: "—",
      extra: "",
      campeon: campeon || "—",
      detalle_penales: detallePenales,
    }),
    estilo: tpl.estilo,
  };
}

export function fraseCortaAleatoria(): string {
  return pickRandom(FRASES_GOL_CORTAS);
}

const PLANTILLAS_PENAL_FALLADO: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¿De qué te vas a disfrazar? {goleador} falló el penal. Penales {marcador}. ¡Señoras y señores, esto es drama puro!",
  },
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¡No inventen! {goleador} la mandó a la luna. Penales {marcador}. ¿Quién es tu daddy? ¡El portero!",
  },
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¡Falló! {goleador} quiso hacerla bonita y la pagó cara. Penales {marcador}. ¡Nervios a flor de piel!",
  },
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¡La botó! {equipo} sufre en la tanda. Penales {marcador}. ¡Esto no se acaba hasta que alguien falle… o no!",
  },
];

const PLANTILLAS_PENAL_FALLADO_SIN_NOMBRE: readonly PlantillaNarracion[] = [
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¿De qué te vas a disfrazar? ¡Falló el penal de {equipo}! Penales {marcador}.",
  },
  {
    region: "mexico",
    estilo: "Martinoli (parodia)",
    plantilla:
      "¡La mandó afuera! {equipo} falla desde los 12 pasos. Penales {marcador}.",
  },
];

export function generarNarracionPenalFallado(params: {
  local: string;
  visitante: string;
  penHome: number;
  penAway: number;
  jugador: string | null;
  equipo: string;
}): { texto: string; estilo: string } {
  const marcadorStr = marcador(params.penHome, params.penAway);
  const plantillas = params.jugador
    ? PLANTILLAS_PENAL_FALLADO
    : PLANTILLAS_PENAL_FALLADO_SIN_NOMBRE;
  const tpl = pickRandom(plantillas);
  return {
    texto: apply(tpl.plantilla, {
      local: params.local,
      visitante: params.visitante,
      marcador: marcadorStr,
      goleador: params.jugador ?? "El cobrador",
      equipo: params.equipo,
      minuto: "—",
      extra: "",
    }),
    estilo: tpl.estilo,
  };
}

export function generarNarracionPenalAnotado(params: {
  local: string;
  visitante: string;
  penHome: number;
  penAway: number;
  goleador: string;
  equipo: string;
}): { texto: string; estilo: string } {
  return generarNarracionGol({
    local: params.local,
    visitante: params.visitante,
    marcadorLocal: params.penHome,
    marcadorVisitante: params.penAway,
    goleador: params.goleador,
    equipo: params.equipo,
    isPenalty: true,
  });
}
