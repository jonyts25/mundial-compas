/**
 * Changelog de producto — “Qué hay de nuevo”.
 * Actualizar WHATS_NEW_VERSION al publicar novedades para re-mostrar el modal.
 */

export const WHATS_NEW_STORAGE_KEY = "mundial-compas:whats-new-seen";

/** Bump al añadir/cambiar WHATS_NEW_ITEMS. */
export const WHATS_NEW_VERSION = "2026-06-pitoniso-v1";

export interface WhatsNewItem {
  emoji: string;
  title: string;
  description: string;
}

export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
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
];
