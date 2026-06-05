"use client";

/** @deprecated Chat general global. Ruta `/chat-general` redirige a `/`. */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { formatMexicoTimeShort } from "@/lib/datetime/mexico";
import { sendChatGeneralMessage } from "@/lib/chat-general/actions";
import {
  aprobarMensaje,
  eliminarMensaje,
  reportarMensaje,
} from "@/lib/partidos/chat-actions";
import { createClient } from "@/lib/supabase/client";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import type { ChatAutor, MensajeChatConAutor, MensajeChatRealtimeRow } from "@/types/chat";
import type { Usuario } from "@/types/database";

interface ChatGeneralProps {
  usuario: Usuario;
  initialMessages: MensajeChatConAutor[];
  esModerador: boolean;
}

function getInitials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function mergeMensajeRow(
  prev: MensajeChatConAutor,
  row: MensajeChatRealtimeRow,
): MensajeChatConAutor {
  return {
    ...prev,
    contenido: row.contenido,
    reportado: row.reportado,
    conteo_reportes: row.conteo_reportes,
    oculto: row.oculto,
  };
}

function rowToMensaje(
  row: MensajeChatRealtimeRow,
  autor: ChatAutor | null,
): MensajeChatConAutor {
  return {
    id: row.id,
    partido_id: row.partido_id ?? "",
    liga_id: row.liga_id,
    usuario_id: row.usuario_id,
    tipo: row.tipo,
    contenido: row.contenido,
    created_at: row.created_at,
    reportado: row.reportado ?? false,
    conteo_reportes: row.conteo_reportes ?? 0,
    oculto: row.oculto ?? false,
    autor,
  };
}

export function ChatGeneral({
  usuario,
  initialMessages,
  esModerador,
}: ChatGeneralProps) {
  const [mensajes, setMensajes] = useState(initialMessages);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accionId, setAccionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoresCache = useRef<Map<string, ChatAutor>>(new Map());

  useEffect(() => {
    setMensajes(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  const applyModeracionUpdate = useCallback(
    (row: MensajeChatRealtimeRow) => {
      setMensajes((prev) => {
        const idx = prev.findIndex((m) => m.id === row.id);
        if (idx === -1) return prev;
        if (row.oculto && !esModerador) {
          return prev.filter((m) => m.id !== row.id);
        }
        const next = [...prev];
        next[idx] = mergeMensajeRow(prev[idx]!, row);
        return next;
      });
    },
    [esModerador],
  );

  const resolveAutor = useCallback(
    async (usuarioId: string | null): Promise<ChatAutor | null> => {
      if (!usuarioId) return null;
      const cached = autoresCache.current.get(usuarioId);
      if (cached) return cached;
      if (usuarioId === usuario.id) {
        const a: ChatAutor = {
          id: usuario.id,
          nombre_visible: usuario.nombre_visible,
          avatar_url: usuario.avatar_url,
        };
        autoresCache.current.set(usuarioId, a);
        return a;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("usuarios")
        .select("id, nombre_visible, avatar_url")
        .eq("id", usuarioId)
        .single();
      if (!data) return null;
      const a: ChatAutor = {
        id: data.id,
        nombre_visible: data.nombre_visible,
        avatar_url: data.avatar_url,
      };
      autoresCache.current.set(usuarioId, a);
      return a;
    },
    [usuario],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-liga-${LIGA_GLOBAL_ID}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes_chat",
          filter: `liga_id=eq.${LIGA_GLOBAL_ID}`,
        },
        async (payload) => {
          const row = payload.new as MensajeChatRealtimeRow;
          if (row.partido_id != null) return;
          if (row.oculto && !esModerador) return;

          const autor = await resolveAutor(row.usuario_id);
          setMensajes((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, rowToMensaje(row, autor)];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mensajes_chat",
          filter: `liga_id=eq.${LIGA_GLOBAL_ID}`,
        },
        (payload) => {
          const row = payload.new as MensajeChatRealtimeRow;
          if (row.partido_id != null) return;
          applyModeracionUpdate(row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [resolveAutor, esModerador, applyModeracionUpdate]);

  function runModeracion(
    mensajeId: string,
    action: (id: string) => Promise<{ ok: boolean; mensaje?: MensajeChatRealtimeRow; error?: string }>,
  ) {
    setAccionId(mensajeId);
    setError(null);
    startTransition(async () => {
      const result = await action(mensajeId);
      if (result.ok && result.mensaje) {
        applyModeracionUpdate(result.mensaje);
      } else if (!result.ok) {
        setError(result.error ?? "Error de moderación");
      }
      setAccionId(null);
    });
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendChatGeneralMessage(texto);
      if (result.ok) {
        setTexto("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-zinc-500">Sala permanente de la liga</p>
          {esModerador && (
            <span className="rounded-full bg-red-950/80 px-2 py-0.5 text-[9px] font-bold uppercase text-red-300 ring-1 ring-red-800/60">
              Moderador
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 max-h-[55vh] space-y-3 overflow-y-auto p-4">
        {mensajes.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Sala de la liga · El VAR suelta trivia en días sin partido.
          </p>
        ) : (
          mensajes.map((msg) => (
            <ChatBubble
              key={msg.id}
              msg={msg}
              esYo={msg.usuario_id === usuario.id}
              esModerador={esModerador}
              accionPendiente={accionId === msg.id && isPending}
              onReportar={() => runModeracion(msg.id, reportarMensaje)}
              onAprobar={() => runModeracion(msg.id, aprobarMensaje)}
              onEliminar={() => runModeracion(msg.id, eliminarMensaje)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Mensaje para la banda…"
            maxLength={500}
            disabled={isPending}
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isPending || !texto.trim()}
            className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
        {error && (
          <p className="mt-2 text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

function ChatBubble({
  msg,
  esYo,
  esModerador,
  accionPendiente,
  onReportar,
  onAprobar,
  onEliminar,
}: {
  msg: MensajeChatConAutor;
  esYo: boolean;
  esModerador: boolean;
  accionPendiente: boolean;
  onReportar: () => void;
  onAprobar: () => void;
  onEliminar: () => void;
}) {
  const esSistema = msg.tipo !== "usuario";

  if (esSistema) {
    return (
      <div className="flex justify-center">
        <p className="max-w-[95%] rounded-2xl bg-zinc-800/80 px-3 py-2 text-center text-[11px] leading-relaxed text-zinc-300">
          {msg.contenido}
        </p>
      </div>
    );
  }

  const nombre = msg.autor?.nombre_visible ?? "Compa";
  const hora = formatMexicoTimeShort(msg.created_at);
  const moderado = esModerador && msg.reportado && !msg.oculto;

  return (
    <article
      className={`group relative flex gap-2 ${esYo ? "flex-row-reverse" : ""} ${
        moderado ? "rounded-xl ring-1 ring-red-500/50" : ""
      }`}
    >
      {!esYo && !msg.oculto && (
        <button
          type="button"
          onClick={onReportar}
          disabled={accionPendiente}
          title="Reportar"
          className="absolute top-0 z-10 rounded bg-zinc-900/90 px-1 text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 right-0"
        >
          🚩
        </button>
      )}

      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          esYo ? "bg-emerald-950 text-emerald-300" : "bg-zinc-800 text-zinc-300"
        }`}
      >
        {getInitials(nombre)}
      </div>
      <div className={`min-w-0 max-w-[80%] ${esYo ? "text-right" : ""}`}>
        <p className="text-[10px] text-zinc-500">
          {nombre} · {hora}
          {msg.reportado && !msg.oculto && (
            <span className="ml-1 text-red-400">· reportado</span>
          )}
        </p>
        <p
          className={`mt-0.5 rounded-2xl px-3 py-2 text-sm ${
            esYo
              ? "bg-emerald-700/40 text-emerald-50"
              : "bg-zinc-800 text-zinc-100"
          }`}
        >
          {msg.contenido}
        </p>
        {esModerador && msg.reportado && !msg.oculto && (
          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              disabled={accionPendiente}
              onClick={onAprobar}
              className="rounded px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-700"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={accionPendiente}
              onClick={onEliminar}
              className="rounded px-2 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-800"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
