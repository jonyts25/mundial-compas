import Link from "next/link";
import { isAppAdmin } from "@/lib/admin/app-admin";
import { countSolicitudesEliminacionPendientes } from "@/lib/liga/eliminacion-admin-queries";

interface AdminPlatformCardProps {
  userId: string;
}

export async function AdminPlatformCard({ userId }: AdminPlatformCardProps) {
  if (!isAppAdmin(userId)) return null;

  const pendientes = await countSolicitudesEliminacionPendientes(userId);

  return (
    <Link
      href="/admin/solicitudes-eliminacion"
      className="mb-4 flex items-center justify-between rounded-xl border border-violet-900/50 bg-violet-950/30 px-4 py-3 transition hover:border-violet-700/60"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-violet-300/80">
          Panel de administración
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white">
          Solicitudes pendientes
        </p>
      </div>
      {pendientes > 0 ? (
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-2 text-xs font-bold text-white">
          {pendientes > 99 ? "99+" : pendientes}
        </span>
      ) : (
        <span className="text-xs text-violet-300/60">Ver panel →</span>
      )}
    </Link>
  );
}
