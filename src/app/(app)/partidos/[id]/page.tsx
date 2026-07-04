import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnalyticsViewTracker } from "@/components/analytics/AnalyticsViewTracker";
import { ChatPartido } from "@/components/partidos/ChatPartido";
import { PartidoAiLabPanel } from "@/components/partidos/PartidoAiLabPanel";
import { PartidoFinalStatistics } from "@/components/partidos/PartidoFinalStatistics";
import { PartidoInfoPanel } from "@/components/partidos/PartidoInfoPanel";
import { PartidoMatchSummaryPanel } from "@/components/partidos/PartidoMatchSummaryPanel";
import { PartidoPronosticoPitonisoBlock } from "@/components/partidos/PartidoPronosticoPitonisoBlock";
import { PartidoHeader } from "@/components/partidos/PartidoHeader";
import { PronosticoReminder } from "@/components/partidos/PronosticoReminder";
import { PronosticosTodosPanel } from "@/components/quiniela/PronosticosTodosPanel";
import { SilenciarNotificacionesPartido } from "@/components/partidos/SilenciarNotificacionesPartido";
import { canUseAiLab } from "@/lib/ai/ai-access";
import { pitonisoStaticContextToLabInput } from "@/lib/ai/pitoniso-signals-format";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { fetchPartidoDetallePageData } from "@/lib/partidos/detail-queries";
import { fetchPitonisoStaticContext } from "@/lib/partidos/pitoniso-queries";
import { isKnockoutPronosticable } from "@/lib/world-cup/knockout-participant-utils";
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

  if (data.canonicalPartidoId && data.canonicalPartidoId !== id) {
    redirect(`/partidos/${data.canonicalPartidoId}`);
  }

  const { partido } = data;
  const esPronosticable =
    (partido.estatus === "programado" || partido.estatus === "aplazado") &&
    isKnockoutPronosticable(partido);
  const finalizado = partido.estatus === "finalizado";
  const enJuego =
    partido.estatus === "en_vivo" || partido.estatus === "medio_tiempo";

  const pitonisoStatic =
    partido.estatus === "programado"
      ? await fetchPitonisoStaticContext(id)
      : null;

  const aiLabEnabled = canUseAiLab(user);
  const aiLabInput =
    aiLabEnabled && pitonisoStatic?.ok
      ? pitonisoStaticContextToLabInput(pitonisoStatic.context)
      : null;

  const partidoLabel = `${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`;

  const chatBlock = (
    <ChatPartido
      key={partido.id}
      partidoId={partido.id}
      ligaId={LIGA_GLOBAL_ID}
      partido={{
        fecha_kickoff: partido.fecha_kickoff,
        estatus: partido.estatus,
        metadata: partido.metadata,
        updated_at: partido.updated_at,
      }}
      usuario={data.usuario}
      esAdmin={data.esAdmin}
      initialMessages={data.mensajes}
    />
  );

  return (
    <div className="flex min-h-full flex-col">
      <AnalyticsViewTracker
        event="match_view"
        properties={{ partido_id: partido.id, estatus: partido.estatus }}
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
        <PartidoHeader partido={partido} />

        {esPronosticable ? (
          <>
            <PartidoPronosticoPitonisoBlock
              partido={partido}
              quinielaContexts={quinielaContexts}
              pitonisoContext={pitonisoStatic?.ok ? pitonisoStatic.context : null}
            />
            {aiLabInput ? <PartidoAiLabPanel labInput={aiLabInput} /> : null}
            <PronosticosTodosPanel partido={partido} ligaId={LIGA_GLOBAL_ID} />
            <SilenciarNotificacionesPartido partidoId={partido.id} />
            <PartidoInfoPanel partido={partido} />
            {chatBlock}
          </>
        ) : null}

        {finalizado ? (
          <>
            {aiLabEnabled ? (
              <PartidoMatchSummaryPanel
                partidoId={partido.id}
                partidoLabel={partidoLabel}
              />
            ) : null}
            <PartidoFinalStatistics
              homeName={partido.equipo_local_nombre}
              awayName={partido.equipo_visitante_nombre}
              metadata={partido.metadata}
            />
            <PronosticoReminder partido={partido} pronostico={data.pronostico} />
            <PronosticosTodosPanel partido={partido} ligaId={LIGA_GLOBAL_ID} />
            <SilenciarNotificacionesPartido partidoId={partido.id} />
            <PartidoInfoPanel partido={partido} />
            {chatBlock}
          </>
        ) : null}

        {enJuego ? (
          <>
            <PronosticoReminder partido={partido} pronostico={data.pronostico} />
            <PronosticosTodosPanel partido={partido} ligaId={LIGA_GLOBAL_ID} />
            {chatBlock}
            <SilenciarNotificacionesPartido partidoId={partido.id} />
            <PartidoInfoPanel partido={partido} />
          </>
        ) : null}

        {!esPronosticable && !finalizado && !enJuego ? (
          <>
            <PronosticoReminder partido={partido} pronostico={data.pronostico} />
            <PronosticosTodosPanel partido={partido} ligaId={LIGA_GLOBAL_ID} />
            <SilenciarNotificacionesPartido partidoId={partido.id} />
            <PartidoInfoPanel partido={partido} />
            {chatBlock}
          </>
        ) : null}
      </main>
    </div>
  );
}
