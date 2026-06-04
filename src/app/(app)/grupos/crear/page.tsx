import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { CrearGrupoForm } from "@/components/grupos/CrearGrupoForm";
import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CrearGrupoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/grupos/crear");

  return (
    <>
      <GrupoPageHeader title="Nueva quiniela" backHref="/grupos" />
      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        <CrearGrupoForm />
      </main>
      <AppBottomNav />
    </>
  );
}
