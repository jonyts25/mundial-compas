import Link from "next/link";
import { redirect } from "next/navigation";
import { canUseAiLab } from "@/lib/ai/ai-access";
import { isAppAdmin } from "@/lib/admin/app-admin";
import { countSolicitudesEliminacionPendientes } from "@/lib/liga/eliminacion-admin-queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAppAdmin(user.id)) redirect("/");

  const showAiLab = canUseAiLab(user);
  const pendientes = await countSolicitudesEliminacionPendientes(user.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-white">
        ← Inicio
      </Link>
      <h1 className="mt-4 text-lg font-bold text-white">
        Panel de administración
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Administración de plataforma (superadmin). No es lo mismo que ser admin
        de una quiniela privada.
      </p>

      <nav className="mt-6 space-y-2">
        <Link
          href="/admin/solicitudes-eliminacion"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition hover:border-zinc-700"
        >
          <span className="text-sm font-semibold text-white">
            Solicitudes de eliminación
          </span>
          {pendientes > 0 && (
            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
              {pendientes}
            </span>
          )}
        </Link>
        {showAiLab && (
          <Link
            href="/lab/ia-local"
            className="flex items-center justify-between rounded-xl border border-violet-800/50 bg-violet-950/20 px-4 py-3 transition hover:border-violet-700"
          >
            <span className="text-sm font-semibold text-violet-200">
              IA Local Lab (Ollama)
            </span>
            <span className="text-[10px] text-violet-400">dev</span>
          </Link>
        )}
      </nav>
    </main>
  );
}
