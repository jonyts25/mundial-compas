import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";
import { MisGruposList } from "@/components/grupos/MisGruposList";
import { fetchMisGrupos } from "@/lib/liga/grupos-queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/grupos");

  const grupos = await fetchMisGrupos(user.id);

  return (
    <>
      <GrupoPageHeader
        title="Mis quinielas"
        subtitle="Quinielas privadas con tus compas"
        backHref="/quiniela"
      />

      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        <div className="mb-4 flex gap-2">
          <Link
            href="/grupos/crear"
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-bold text-white"
          >
            + Nueva quiniela
          </Link>
          <Link
            href="/grupos/unirse"
            className="flex-1 rounded-xl border border-zinc-600 py-2.5 text-center text-sm font-semibold text-zinc-200"
          >
            Unirme
          </Link>
        </div>

        <MisGruposList grupos={grupos} />

        <p className="mt-6 text-center text-xs text-zinc-600">
          La quiniela global{" "}
          <Link href="/quiniela" className="text-emerald-500 hover:underline">
            Mundial Compas
          </Link>{" "}
          es independiente de tus quinielas privadas.
        </p>
      </main>

      <AppBottomNav />
    </>
  );
}
