"use client";

import { useEffect, useState } from "react";
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
import type { Usuario } from "@/types/database";

interface ChatPartidoProps {
  partidoId: string;
  ligaId: string;
  partido: PartidoChatInput;
  usuario: Usuario;
  esAdmin: boolean;
  initialMessages: MensajeChatConAutor[];
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
      onSend={(texto) => sendChatMessage(partidoId, texto)}
      onReportar={reportarMensaje}
      onAprobar={aprobarMensaje}
      onEliminar={eliminarMensaje}
      realtime={{ ligaId, partidoId }}
    />
  );
}
