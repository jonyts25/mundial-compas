"use client";

import { usePushPartidoSilenciado } from "@/components/push/PushSilenciadosProvider";

interface SilenciarPartidoToggleProps {
  partidoId: string;
  className?: string;
}

export function SilenciarPartidoToggle({
  partidoId,
  className = "",
}: SilenciarPartidoToggleProps) {
  const { silenciado, loading, toggle } = usePushPartidoSilenciado(partidoId);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      title={
        silenciado
          ? "Activar avisos de este partido"
          : "Silenciar avisos de este partido"
      }
      aria-label={silenciado ? "Activar avisos" : "Silenciar avisos"}
      aria-pressed={silenciado}
      className={`shrink-0 rounded-lg border p-1.5 text-sm transition disabled:opacity-50 ${
        silenciado
          ? "border-zinc-700 bg-zinc-800/80 text-zinc-400"
          : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
      } ${className}`}
    >
      {silenciado ? "🔕" : "🔔"}
    </button>
  );
}
