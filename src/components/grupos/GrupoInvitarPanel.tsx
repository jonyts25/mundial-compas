import Link from "next/link";
import { isOwnerOrAdmin } from "@/lib/liga/roles";
import type { RolLiga } from "@/lib/liga/roles";

interface GrupoInvitarPanelProps {
  nombre: string;
  codigoInvitacion: string | null;
  rol: RolLiga;
}

export function GrupoInvitarPanel({
  nombre,
  codigoInvitacion,
  rol,
}: GrupoInvitarPanelProps) {
  const puedeInvitar = isOwnerOrAdmin(rol);

  if (!puedeInvitar) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
        Solo el owner o un admin pueden ver el código y compartir invitaciones.
        Pide a un admin de <strong className="text-zinc-400">{nombre}</strong>.
      </div>
    );
  }

  if (!codigoInvitacion) {
    return (
      <p className="text-sm text-zinc-500">Código no disponible.</p>
    );
  }

  const joinPath = `/grupos/unirse?codigo=${encodeURIComponent(codigoInvitacion)}`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Código de invitación
        </p>
        <p className="mt-1 font-mono text-2xl font-black tracking-widest text-emerald-400">
          {codigoInvitacion}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Tus compas lo ingresan en «Unirme a un grupo».
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Enlace directo
        </p>
        <p className="mt-1 break-all font-mono text-xs text-zinc-400">{joinPath}</p>
        <Link
          href={joinPath}
          className="mt-3 inline-block text-sm font-semibold text-emerald-500 hover:underline"
        >
          Abrir pantalla de unión →
        </Link>
      </div>
    </div>
  );
}
