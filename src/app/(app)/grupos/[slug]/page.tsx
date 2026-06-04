import { notFound, redirect } from "next/navigation";

import { AppBottomNav } from "@/components/home/AppBottomNav";

import { GrupoDetalleTabs } from "@/components/grupos/GrupoDetalleTabs";

import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";

import {

  fetchGrupoBySlug,

  fetchGrupoMiembros,

} from "@/lib/liga/grupos-queries";

import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";

import { createClient } from "@/lib/supabase/server";



export const dynamic = "force-dynamic";



interface PageProps {

  params: Promise<{ slug: string }>;

}



export default async function GrupoDetallePage({ params }: PageProps) {

  const { slug } = await params;

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) redirect(`/login?next=/grupos/${slug}`);



  const grupo = await fetchGrupoBySlug(user.id, slug);

  if (!grupo) notFound();



  if (!grupo.activa) {

    return (

      <>

        <GrupoPageHeader title={grupo.nombre} backHref="/grupos" />

        <main className="px-4 py-8 text-center text-sm text-zinc-400">

          Este grupo ya no está activo.

        </main>

      </>

    );

  }



  const miembros = await fetchGrupoMiembros(grupo.id);



  return (

    <>

      <GrupoPageHeader

        title={grupo.nombre}

        subtitle={TIPO_QUINIELA_LABELS[grupo.tipo_quiniela]}

        backHref="/grupos"

      />



      <main className="mx-auto max-w-lg px-4 py-4 pb-28">

        <GrupoDetalleTabs

          grupo={grupo}

          slug={slug}

          miembros={miembros}

          currentUserId={user.id}

        />

      </main>



      <AppBottomNav />

    </>

  );

}

