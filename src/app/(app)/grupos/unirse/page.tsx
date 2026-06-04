import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";
import { UnirseGrupoForm } from "@/components/grupos/UnirseGrupoForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UnirseGrupoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/grupos/unirse");

  return (
    <>
      <GrupoPageHeader title="Unirme a un grupo" backHref="/grupos" />
      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        <p className="mb-4 text-sm text-zinc-400">
          Pide el código a quien creó el grupo (8 caracteres).
        </p>
        <UnirseGrupoForm />
      </main>
      <AppBottomNav />
    </>
  );
}
