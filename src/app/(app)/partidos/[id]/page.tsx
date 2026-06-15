import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnalyticsViewTracker } from "@/components/analytics/AnalyticsViewTracker";
import { ChatPartido } from "@/components/partidos/ChatPartido";
import { PartidoInfoPanel } from "@/components/partidos/PartidoInfoPanel";
import { PartidoPronosticoPitonisoBlock } from "@/components/partidos/PartidoPronosticoPitonisoBlock";
import { PartidoHeader } from "@/components/partidos/PartidoHeader";
import { PronosticoReminder } from "@/components/partidos/PronosticoReminder";
import { PronosticosTodosPanel } from "@/components/quiniela/PronosticosTodosPanel";
import { SilenciarNotificacionesPartido } from "@/components/partidos/SilenciarNotificacionesPartido";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { fetchPartidoDetallePageData } from "@/lib/partidos/detail-queries";
import { fetchPitonisoStaticContext } from "@/lib/partidos/pitoniso-queries";
import { fetchPartidoQuinielaContexts } from "@/lib/queries/partido-quiniela-contexts";
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

  const [data, quinielaContexts] = await Promise.all([
    fetchPartidoDetallePageData(user.id, id),
    fetchPartidoQuinielaContexts(id, user.id),
  ]);
  if (!data) {
    notFound();
  }

  const esPronosticable =
    data.partido.estatus === "programado" || data.partido.estatus === "aplazado";

  const pitonisoStatic =
    data.partido.estatus === "programado"
      ? await fetchPitonisoStaticContext(id)
      : null;

  return (
    <div className="flex min-h-full flex-col">
      <AnalyticsViewTracker
        event="match_view"
        properties={{ partido_id: data.partido.id, estatus: data.partido.estatus }}
      />
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ←
          </Link>
          <h1 className="truncate text-lg font-bold text-white">Partidos</h1>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <PartidoHeader partido={data.partido} />
        {esPronosticable ? (
          <PartidoPronosticoPitonisoBlock
            partido={data.partido}
            quinielaContexts={quinielaContexts}
            pitonisoContext={pitonisoStatic?.ok ? pitonisoStatic.context : null}
          />
        ) : null}
        <SilenciarNotificacionesPartido partidoId={data.partido.id} />
        <PartidoInfoPanel partido={data.partido} />
        {!esPronosticable ? (
          <PronosticoReminder partido={data.partido} pronostico={data.pronostico} />
        ) : null}
        <PronosticosTodosPanel partido={data.partido} ligaId={LIGA_GLOBAL_ID} />
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
