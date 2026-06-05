import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";
import {
  UnirseGrupoForm,
  type UnirsePreviewInitial,
} from "@/components/grupos/UnirseGrupoForm";
import { previewGrupoPorCodigo } from "@/lib/liga/grupos-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ codigo?: string }>;
}

export default async function UnirseGrupoPage({ searchParams }: PageProps) {
  const { codigo } = await searchParams;
  const codigoNorm = codigo?.trim().toUpperCase() ?? "";

  const nextPath = codigoNorm
    ? `/grupos/unirse?codigo=${encodeURIComponent(codigoNorm)}`
    : "/grupos/unirse";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  let initialPreview: UnirsePreviewInitial | null = null;
  let initialError: string | null = null;

  if (codigoNorm.length >= 4) {
    const result = await previewGrupoPorCodigo(codigoNorm);
    if (result.ok && result.nombre && result.slug && result.tipo_quiniela) {
      initialPreview = {
        nombre: result.nombre,
        slug: result.slug,
        tipoQuiniela: result.tipo_quiniela,
        modoCompetencia: result.modo_competencia ?? "honor",
        miembrosCount: result.miembros_count ?? 0,
        ownerNombre: result.owner_nombre,
      };
    } else if (!result.ok) {
      initialError = result.error ?? "Código no encontrado";
    }
  }

  return (
    <>
      <GrupoPageHeader title="Unirme a una quiniela" backHref="/grupos" />
      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        <UnirseGrupoForm
          codigoInicial={codigoNorm}
          initialPreview={initialPreview}
          initialError={initialError}
        />
      </main>
      <AppBottomNav />
    </>
  );
}
