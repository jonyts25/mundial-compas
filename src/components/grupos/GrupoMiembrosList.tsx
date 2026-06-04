import { RolBadge } from "@/components/grupos/RolBadge";
import type { GrupoMiembroRow } from "@/lib/liga/grupos-queries";

interface GrupoMiembrosListProps {
  miembros: GrupoMiembroRow[];
  currentUserId: string;
}

export function GrupoMiembrosList({
  miembros,
  currentUserId,
}: GrupoMiembrosListProps) {
  if (miembros.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-center text-sm text-zinc-500">
        No hay miembros para mostrar.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {miembros.map((m) => (
        <li
          key={m.usuario_id}
          className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">
              {m.nombre_visible}
              {m.usuario_id === currentUserId && (
                <span className="ml-1 text-xs font-normal text-zinc-500">
                  (tú)
                </span>
              )}
            </p>
          </div>
          <RolBadge rol={m.rol} />
        </li>
      ))}
    </ul>
  );
}
