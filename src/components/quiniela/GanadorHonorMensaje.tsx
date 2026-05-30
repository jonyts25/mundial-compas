interface GanadorHonorMensajeProps {
  visible: boolean;
  modo: "activo" | "final";
  ganadorEconomicoNombre?: string | null;
}

/**
 * Usuario gratuito líder global por encima del 1° de paga (ganador moral).
 */
export function GanadorHonorMensaje({
  visible,
  modo,
  ganadorEconomicoNombre,
}: GanadorHonorMensajeProps) {
  if (!visible) return null;

  return (
    <section className="mb-4 rounded-2xl border border-violet-600/40 bg-gradient-to-br from-violet-950/50 to-zinc-950 px-4 py-4 text-center shadow-lg">
      <p className="text-2xl" aria-hidden>
        🎖️
      </p>
      <h2 className="mt-2 text-lg font-black text-violet-200">
        {modo === "final" ? "¡Ganaste por el honor!" : "¡Vas ganando por el honor!"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Lideras la quiniela general en puntos, pero la bolsa y el tablón de liquidación
        son exclusivos de la quiniela de paga.
        {ganadorEconomicoNombre && (
          <>
            {" "}
            Campeón económico:{" "}
            <span className="font-semibold text-amber-300">
              {ganadorEconomicoNombre} 👑
            </span>
          </>
        )}
      </p>
    </section>
  );
}
