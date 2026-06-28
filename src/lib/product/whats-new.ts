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

/** Bump al añadir/cambiar WHATS_NEW_ITEMS. */
export const WHATS_NEW_VERSION = KNOCKOUT_ROUND_QUINIELA_VERSION;

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

export const KNOCKOUT_RULES_ANNOUNCEMENT: WhatsNewItem = {
  emoji: "🏆",
  title: "Arranca la fase final",
  description:
    "En eliminatorias, tu pronóstico cuenta hasta el marcador final del partido. Si hay tiempo extra, cuenta el marcador tras 120'. Si hay penales, el resultado de quiniela sigue siendo empate; los penales solo definen quién avanza.",
};

export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
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
