import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChatPartido } from "@/components/partidos/ChatPartido";
import { PartidoInfoPanel } from "@/components/partidos/PartidoInfoPanel";
import { PartidoHeader } from "@/components/partidos/PartidoHeader";
import { PronosticoReminder } from "@/components/partidos/PronosticoReminder";
import { SilenciarNotificacionesPartido } from "@/components/partidos/SilenciarNotificacionesPartido";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { fetchPartidoDetallePageData } from "@/lib/partidos/detail-queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await fetchPartidoDetallePageData(user.id, id);
  if (!data) {
    notFound();
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/95 px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          ← Partidos
        </Link>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <PartidoHeader partido={data.partido} />
        <SilenciarNotificacionesPartido partidoId={data.partido.id} />
        <PartidoInfoPanel partido={data.partido} />
        <PronosticoReminder partido={data.partido} pronostico={data.pronostico} />
        <ChatPartido
          key={data.partido.id}
          partidoId={data.partido.id}
          ligaId={LIGA_GLOBAL_ID}
          partido={{
            fecha_kickoff: data.partido.fecha_kickoff,
            estatus: data.partido.estatus,
            metadata: data.partido.metadata,
            updated_at: data.partido.updated_at,
          }}
          usuario={data.usuario}
          esAdmin={data.esAdmin}
          initialMessages={data.mensajes}
        />
      </main>
    </div>
  );
}
