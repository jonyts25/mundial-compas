"use client";

import { ChatRoomPanel } from "@/components/chat/ChatRoomPanel";
import { DISCLAIMER_CHAT_GRUPO } from "@/lib/legal/disclaimers";
import { sendGrupoChatMessage } from "@/lib/chat/grupo-actions";
import {
  aprobarMensaje,
  eliminarMensaje,
  reportarMensaje,
} from "@/lib/partidos/chat-actions";
import type { MensajeChatConAutor } from "@/types/chat";
import type { Usuario } from "@/types/database";

interface GrupoChatProps {
  ligaId: string;
  grupoSlug: string;
  grupoNombre: string;
  usuario: Usuario;
  puedeAdministrar: boolean;
  initialMessages: MensajeChatConAutor[];
}

export function GrupoChat({
  ligaId,
  grupoSlug,
  grupoNombre,
  usuario,
  puedeAdministrar,
  initialMessages,
}: GrupoChatProps) {
  return (
    <ChatRoomPanel
      channelId={`grupo:${ligaId}`}
      headerTitle={`Chat · ${grupoNombre}`}
      headerSubtitle={`Solo miembros · ${DISCLAIMER_CHAT_GRUPO}`}
      usuario={usuario}
      initialMessages={initialMessages}
      esModerador={puedeAdministrar}
      moderadorBadge="Admin"
      canSend
      inputPlaceholder="Escribe al grupo…"
      onSend={(texto) => sendGrupoChatMessage(ligaId, grupoSlug, texto)}
      onReportar={reportarMensaje}
      onAprobar={aprobarMensaje}
      onEliminar={eliminarMensaje}
      realtime={{ ligaId, soloGrupoPrivado: true }}
      footerExtra={
        puedeAdministrar ? (
          <p className="mb-2 text-[10px] text-zinc-500">
            Como admin puedes eliminar mensajes. Silenciar usuarios: próximamente.
          </p>
        ) : null
      }
    />
  );
}
