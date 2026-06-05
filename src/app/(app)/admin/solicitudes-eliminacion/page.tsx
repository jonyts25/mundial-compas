import Link from "next/link";
import { redirect } from "next/navigation";
import { SolicitudesEliminacionPanel } from "@/components/admin/SolicitudesEliminacionPanel";
import { isAppAdmin } from "@/lib/admin/app-admin";
import { fetchSolicitudesEliminacionAdmin } from "@/lib/liga/eliminacion-admin-queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSolicitudesEliminacionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAppAdmin(user.id)) redirect("/");

  const solicitudes = await fetchSolicitudesEliminacionAdmin(user.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-12">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-white">
        ← Panel de administración
      </Link>
      <h1 className="mt-4 text-lg font-bold text-white">
        Solicitudes de eliminación
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Revisa, aprueba o rechaza solicitudes de quinielas privadas. Aprobar
        desactiva el grupo sin borrar datos.
      </p>

      <SolicitudesEliminacionPanel solicitudes={solicitudes} />
    </main>
  );
}
