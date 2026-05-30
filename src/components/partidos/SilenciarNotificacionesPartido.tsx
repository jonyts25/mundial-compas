"use client";

import { usePushPartidoSilenciado } from "@/components/push/PushSilenciadosProvider";

interface SilenciarNotificacionesPartidoProps {
  partidoId: string;
}

export function SilenciarNotificacionesPartido({
  partidoId,
}: SilenciarNotificacionesPartidoProps) {
  const { silenciado, loading, toggle } = usePushPartidoSilenciado(partidoId);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void toggle()}
      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-60 ${
        silenciado
          ? "border-zinc-700 bg-zinc-900/60 text-zinc-300"
          : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      <span className="font-medium text-white">
        {silenciado ? "🔕 Avisos silenciados" : "🔔 Avisos activos"}
      </span>
      <span className="mt-0.5 block text-xs leading-relaxed">
        {silenciado
          ? "Toca para volver a recibir goles y fases de este partido."
          : "Toca para no recibir notificaciones de este partido."}
      </span>
    </button>
  );
}
