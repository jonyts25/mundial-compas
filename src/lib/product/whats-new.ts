/**
 * Changelog de producto — “Qué hay de nuevo”.
 * Actualizar WHATS_NEW_VERSION al publicar novedades para re-mostrar el modal.
 */

export const WHATS_NEW_STORAGE_KEY = "mundial-compas:whats-new-seen";

/** Banner eliminatoria habilitada — versión fija de dismiss. */
export const KNOCKOUT_QUINIELA_BANNER_VERSION = "2026-06-knockout-quiniela-v1";

/** Banner dismissible en pantallas de quiniela (eliminatoria habilitada). */
export const KNOCKOUT_QUINIELA_BANNER_KEY =
  "mundial-compas:knockout-quiniela-banner-seen";

/** Banner reglas eliminatoria — dedupe independiente. */
export const KNOCKOUT_RULES_BANNER_KEY =
  "mundial-compas:knockout-rules-banner-seen";

/** Clave dedupe push / notificaciones producto. */
export const KNOCKOUT_RULES_VERSION = "2026-06-knockout-rules-v1";

/** Quiniela por rondas + horarios KO corregidos. */
export const KNOCKOUT_ROUND_QUINIELA_VERSION = "2026-06-knockout-round-quiniela-v1";

/** Octavos sincronizados con cuadro + escudos en quiniela. */
export const KNOCKOUT_OCTAVOS_SYNC_VERSION = "2026-07-knockout-octavos-sync-v1";

/** Cierre del Mundial — mensaje de despedida de la app de prueba. */
export const WORLD_CUP_CLOSING_VERSION = "2026-07-world-cup-closing-v1";

/** España campeona — push de felicitación. */
export const SPAIN_CHAMPION_VERSION = "2026-07-spain-champion-v1";

/** Despedida final de Mundial Compas. */
export const MUNDIAL_COMPAS_FAREWELL_VERSION = "2026-07-mundial-compas-farewell-v1";

/** Banner campeón en la app. */
export const WORLD_CUP_CHAMPION_BANNER_KEY =
  "mundial-compas:world-cup-champion-banner-seen";
export const WORLD_CUP_CHAMPION_BANNER_VERSION = "2026-07-spain-champion-banner-v1";

/** Bump al añadir/cambiar WHATS_NEW_ITEMS. */
export const WHATS_NEW_VERSION = MUNDIAL_COMPAS_FAREWELL_VERSION;

export interface WhatsNewItem {
  emoji: string;
  title: string;
  description: string;
}

export const KNOCKOUT_QUINIELA_ANNOUNCEMENT: WhatsNewItem = {
  emoji: "🏆",
  title: "Eliminatoria en la quiniela",
  description:
    "Ya puedes pronosticar la fase eliminatoria: ronda de 32, octavos, cuartos, semifinal, tercer lugar y final. Los cruces con equipos por definir aparecen en el calendario; podrás guardar tu marcador en cuanto se confirmen ambos.",
};

export const KNOCKOUT_ROUND_QUINIELA_ANNOUNCEMENT: WhatsNewItem = {
  emoji: "🏆",
  title: "Quiniela por rondas — ¡partido de hoy!",
  description:
    "La quiniela ya muestra cada fase eliminatoria por sección: Ronda de 32, octavos, cuartos, semifinales, tercer lugar y final. Ya puedes pronosticar el partido de hoy; corregimos los horarios y la quiniela cierra 5 min antes del pitazo.",
};

export const KNOCKOUT_OCTAVOS_SYNC_ANNOUNCEMENT: WhatsNewItem = {
  emoji: "🏆",
  title: "Octavos listos en la quiniela",
  description:
    "La quiniela ya coincide con el cuadro general: octavos del fin de semana con equipos, escudos y horarios. Ya puedes pronosticar Brasil–Noruega, México–Inglaterra, Portugal–España y USA–Bélgica. Los cruces del viernes se completan al terminar los dieciseisavos de hoy.",
};

export const KNOCKOUT_RULES_ANNOUNCEMENT: WhatsNewItem = {
  emoji: "🏆",
  title: "Arranca la fase final",
  description:
    "En eliminatorias, tu pronóstico cuenta hasta el marcador final del partido. Si hay tiempo extra, cuenta el marcador tras 120'. Si hay penales, el resultado de quiniela sigue siendo empate; los penales solo definen quién avanza.",
};

export const WORLD_CUP_CLOSING_ANNOUNCEMENT: WhatsNewItem = {
  emoji: "🏆",
  title: "¡El Mundial está por terminar!",
  description:
    "Esperamos que hayan disfrutado esta app de prueba y que los tropiezos hayan sido mínimos. Si tienen algún comentario, háganlo saber a través de quien les compartió la app. ¡Disfruten la final y que gane el mejor!",
};

export const SPAIN_CHAMPION_ANNOUNCEMENT: WhatsNewItem = {
  emoji: "🇪🇸",
  title: "¡España, campeona del mundo!",
  description:
    "La Roja vence 1-0 a Argentina en la prórroga y levanta su segundo título mundial. ¡Felicidades a todos los españoles y a quienes la apoyaron!",
};

export const MUNDIAL_COMPAS_FAREWELL_ANNOUNCEMENT: WhatsNewItem = {
  emoji: "👋",
  title: "Gracias por jugar Mundial Compas",
  description:
    "Con la final concluida, esta experiencia de prueba llega a su fin. Gracias por su apoyo, sus pronósticos y por acompañarnos en el Mundial. ¡Hasta la próxima!",
};

export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  MUNDIAL_COMPAS_FAREWELL_ANNOUNCEMENT,
  SPAIN_CHAMPION_ANNOUNCEMENT,
  WORLD_CUP_CLOSING_ANNOUNCEMENT,
  KNOCKOUT_OCTAVOS_SYNC_ANNOUNCEMENT,
  KNOCKOUT_ROUND_QUINIELA_ANNOUNCEMENT,
  KNOCKOUT_RULES_ANNOUNCEMENT,
  KNOCKOUT_QUINIELA_ANNOUNCEMENT,
  {
    emoji: "✅",
    title: "Quinielas abiertas de nuevo",
    description:
      "Las quinielas global y privadas se bloquearon por error: al marcar un líder inalcanzable no se contaban los partidos de eliminatoria. Ya está corregido.",
  },
  {
    emoji: "🔮",
    title: "El Pitoniso llegó",
    description:
      "Ahora puedes ver una lectura previa del partido antes de guardar tu pronóstico.",
  },
  {
    emoji: "⚽",
    title: "Pronostica desde el partido",
    description:
      "Ya puedes guardar o editar tu marcador directamente en la pantalla del partido.",
  },
  {
    emoji: "👀",
    title: "Rivales al descubierto",
    description:
      "En partidos terminados puedes ver los pronósticos de tus rivales de quiniela.",
  },
  {
    emoji: "📊",
    title: "Análisis post-partido",
    description:
      "Después del resultado puedes revisar cómo se movieron los pronósticos y qué tan común fue cada marcador.",
  },
  {
    emoji: "👋",
    title: "Tu resumen en inicio",
    description:
      "Saludo con tu lugar en el ranking, perfil de jugador y cuántos pronósticos te faltan.",
  },
  {
    emoji: "🎯",
    title: "Carrusel de quinielas",
    description:
      "Desliza entre quiniela global y tus grupos: progreso, ranking, pendientes y acceso rápido desde el inicio.",
  },
  {
    emoji: "⚽",
    title: "Pronostica en la quiniela correcta",
    description:
      "En la pantalla del partido elige si guardas en global o en un grupo privado con chips para cambiar de quiniela.",
  },
  {
    emoji: "🔮",
    title: "Pitoniso por quiniela",
    description:
      "El Pitoniso lee la multitud de la quiniela que tienes seleccionada, no solo la global.",
  },
  {
    emoji: "📱",
    title: "Pantalla de partido mejorada",
    description:
      "Flecha atrás alineada al notch en iPhone y corrección al cambiar de quiniela sin duplicar El Pitoniso.",
  },
];
