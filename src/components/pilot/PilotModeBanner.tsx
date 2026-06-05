import Link from "next/link";

interface PilotModeBannerProps {
  label: string;
  partidosPilotCount?: number;
}

export function PilotModeBanner({
  label,
  partidosPilotCount = 0,
}: PilotModeBannerProps) {
  return (
    <section
      className="mb-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/80 to-zinc-900/80 px-4 py-3"
      aria-label="Modo prueba activo"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          🧪
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-400">
            Fin de semana de prueba
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-100">{label}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {partidosPilotCount > 0
              ? `${partidosPilotCount} partido(s) de prueba cargados · chat en vivo, mensajes VAR y quiniela activos`
              : "Carga partidos con POST /api/admin/cargar-partidos?modo=pilot"}
          </p>
          <p className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link href="/grupos" className="text-amber-300 underline-offset-2 hover:underline">
              Mis quinielas
            </Link>
            <Link href="/quiniela" className="text-amber-300 underline-offset-2 hover:underline">
              Quiniela
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
