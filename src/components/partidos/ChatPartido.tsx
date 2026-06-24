"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatRoomPanel } from "@/components/chat/ChatRoomPanel";
import {
  CHAT_PARTIDO_AVISO_CIERRE,
  isMatchChatBeforeOpen,
  isMatchChatClosedAfterFinish,
  isMatchChatOpen,
  matchChatInputPlaceholder,
  type PartidoChatInput,
} from "@/lib/chat/match-chat-window";
import {
  aprobarMensaje,
  eliminarMensaje,
  reportarMensaje,
  sendChatMessage,
} from "@/lib/partidos/chat-actions";
import type { MensajeChatConAutor } from "@/types/chat";
import type { EstatusPartido, Usuario } from "@/types/database";

interface ChatPartidoProps {
  partidoId: string;
  ligaId: string;
  partido: PartidoChatInput;
  usuario: Usuario;
  esAdmin: boolean;
  initialMessages: MensajeChatConAutor[];
}

function chatDefaultCollapsed(estatus: EstatusPartido): boolean {
  return (
    estatus === "finalizado" ||
    estatus === "programado" ||
    estatus === "aplazado"
  );
}

function chatCollapsedPreview(
  messages: MensajeChatConAutor[],
  partido: PartidoChatInput,
  nowMs: number,
): string {
  if (isMatchChatBeforeOpen(partido, nowMs)) {
    return "Abre 15 min antes del pitazo";
  }

  const count = messages.length;
  if (count === 0) return "Sin mensajes";

  const human = messages.filter((m) => m.tipo === "usuario").length;
  if (human === 0) {
    return `${count} evento${count === 1 ? "" : "s"} del partido`;
  }
  return `${count} mensajes · ${human} de compas`;
}

export function ChatPartido({
  partidoId,
  ligaId,
  partido,
  usuario,
  esAdmin,
  initialMessages,
}: ChatPartidoProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const chatAbierto = isMatchChatOpen(partido, nowMs);
  const cerrado = isMatchChatClosedAfterFinish(partido, nowMs);
  const antesDeAbrir = isMatchChatBeforeOpen(partido, nowMs);

  const realtimeConfig = useMemo(
    () => ({ ligaId, partidoId }),
    [ligaId, partidoId],
  );

  const defaultCollapsed = chatDefaultCollapsed(partido.estatus);
  const collapsedPreview = chatCollapsedPreview(
    initialMessages,
    partido,
    nowMs,
  );

  return (
    <ChatRoomPanel
      channelId={`partido:${partidoId}`}
      headerTitle="Chat del partido"
      headerSubtitle="Comunidad Mundial Compas · todos los compas"
      headerHint={
        !cerrado && !antesDeAbrir ? CHAT_PARTIDO_AVISO_CIERRE : undefined
      }
      usuario={usuario}
      initialMessages={initialMessages}
      esModerador={esAdmin}
      moderadorBadge="Moderador app"
      canSend={chatAbierto}
      inputPlaceholder={matchChatInputPlaceholder(partido, nowMs)}
      closedBadge={cerrado ? "Chat cerrado" : undefined}
      defaultCollapsed={defaultCollapsed}
      collapsedPreview={collapsedPreview}
      onSend={(texto) => sendChatMessage(partidoId, texto)}
      onReportar={reportarMensaje}
      onAprobar={aprobarMensaje}
      onEliminar={eliminarMensaje}
      realtime={realtimeConfig}
    />
  );
}
