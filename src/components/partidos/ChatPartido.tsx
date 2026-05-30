"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { formatMexicoTimeShort } from "@/lib/datetime/mexico";
import {
  aprobarMensaje,
  eliminarMensaje,
  reportarMensaje,
  sendChatMessage,
} from "@/lib/partidos/chat-actions";
import {
  CHAT_CERRADO_PLACEHOLDER,
  isChatAbierto,
} from "@/lib/partidos/chat-window";
import { createClient } from "@/lib/supabase/client";
import type {
  ChatAutor,
  MensajeChatConAutor,
  MensajeChatRealtimeRow,
} from "@/types/chat";
import type { Usuario } from "@/types/database";

interface ChatPartidoProps {
  partidoId: string;
  ligaId: string;
  fechaKickoff: string;
  usuario: Usuario;
  esAdmin: boolean;
  initialMessages: MensajeChatConAutor[];
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
    partido_id: row.partido_id,
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

export function ChatPartido({
  partidoId,
  ligaId,
  fechaKickoff,
  usuario,
  esAdmin,
  initialMessages,
}: ChatPartidoProps) {
  const [mensajes, setMensajes] = useState<MensajeChatConAutor[]>(initialMessages);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accionId, setAccionId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoresCache = useRef<Map<string, ChatAutor>>(new Map());

  const chatAbierto = isChatAbierto(fechaKickoff, nowMs);

  useEffect(() => {
    setMensajes(initialMessages);
  }, [partidoId, initialMessages]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom("instant");
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes.length, scrollToBottom]);

  const applyModeracionUpdate = useCallback(
    (row: MensajeChatRealtimeRow) => {
      setMensajes((prev) => {
        const idx = prev.findIndex((m) => m.id === row.id);
        if (idx === -1) return prev;

        if (row.oculto && !esAdmin) {
          return prev.filter((m) => m.id !== row.id);
        }

        const next = [...prev];
        next[idx] = mergeMensajeRow(prev[idx], row);
        return next;
      });
    },
    [esAdmin],
  );

  const resolveAutor = useCallback(
    async (usuarioId: string | null): Promise<ChatAutor | null> => {
      if (!usuarioId) return null;
      if (usuarioId === usuario.id) {
        return {
          id: usuario.id,
          nombre_visible: usuario.nombre_visible,
          avatar_url: usuario.avatar_url,
        };
      }
      const cached = autoresCache.current.get(usuarioId);
      if (cached) return cached;

      const supabase = createClient();
      const { data } = await supabase
        .from("usuarios")
        .select("id, nombre_visible, avatar_url")
        .eq("id", usuarioId)
        .single();

      if (!data) return null;
      const autor: ChatAutor = {
        id: data.id,
        nombre_visible: data.nombre_visible,
        avatar_url: data.avatar_url,
      };
      autoresCache.current.set(usuarioId, autor);
      return autor;
    },
    [usuario],
  );

  const appendMensaje = useCallback((msg: MensajeChatConAutor) => {
    setMensajes((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      if (msg.oculto && !esAdmin) return prev;
      return [...prev, msg];
    });
  }, [esAdmin]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat:${partidoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes_chat",
          filter: `partido_id=eq.${partidoId}`,
        },
        async (payload) => {
          const row = payload.new as MensajeChatRealtimeRow;
          if (row.liga_id !== ligaId) return;

          const autor =
            row.tipo === "usuario" && row.usuario_id
              ? await resolveAutor(row.usuario_id)
              : null;

          appendMensaje(rowToMensaje(row, autor));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mensajes_chat",
          filter: `partido_id=eq.${partidoId}`,
        },
        (payload) => {
          const row = payload.new as MensajeChatRealtimeRow;
          if (row.liga_id !== ligaId) return;
          applyModeracionUpdate(row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [partidoId, ligaId, appendMensaje, applyModeracionUpdate, resolveAutor]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatAbierto) return;
    const trimmed = texto.trim();
    if (!trimmed || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await sendChatMessage(partidoId, trimmed);
      if (result.ok) {
        setTexto("");
      } else {
        setError(result.error);
      }
    });
  }

  function runModeracion(
    mensajeId: string,
    action: (id: string) => Promise<{ ok: boolean; error?: string; mensaje?: MensajeChatRealtimeRow }>,
  ) {
    setError(null);
    setAccionId(mensajeId);
    startTransition(async () => {
      const result = await action(mensajeId);
      setAccionId(null);
      if (result.ok && result.mensaje) {
        applyModeracionUpdate(result.mensaje);
      } else if (!result.ok) {
        setError(result.error ?? "No se pudo completar la acción");
      }
    });
  }

  return (
    <section className="flex min-h-[min(420px,50vh)] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white">Chat del partido</h2>
            <p className="text-[10px] text-zinc-500">Liga Mundial Compas · en vivo</p>
          </div>
          {esAdmin && (
            <span className="rounded-full bg-red-950/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-300 ring-1 ring-red-800/60">
              Moderador
            </span>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
        aria-live="polite"
        aria-label="Mensajes del chat"
      >
        {mensajes.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Sé el primero en escribir. ¡Ánimo, compa!
          </p>
        ) : (
          mensajes.map((msg) => (
            <MensajeBubble
              key={msg.id}
              msg={msg}
              esPropio={msg.usuario_id === usuario.id}
              esAdmin={esAdmin}
              accionPendiente={accionId === msg.id && isPending}
              onReportar={() => runModeracion(msg.id, reportarMensaje)}
              onAprobar={() => runModeracion(msg.id, aprobarMensaje)}
              onEliminar={() => runModeracion(msg.id, eliminarMensaje)}
            />
          ))
        )}
        <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-zinc-800 bg-zinc-950/80 p-3"
      >
        {error && (
          <p className="mb-2 text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              chatAbierto ? "Escribe al grupo…" : CHAT_CERRADO_PLACEHOLDER
            }
            maxLength={500}
            disabled={isPending || !chatAbierto}
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Mensaje del chat"
          />
          <button
            type="submit"
            disabled={isPending || !texto.trim() || !chatAbierto}
            className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "…" : "Enviar"}
          </button>
        </div>
      </form>
    </section>
  );
}

function MensajeBubble({
  msg,
  esPropio,
  esAdmin,
  accionPendiente,
  onReportar,
  onAprobar,
  onEliminar,
}: {
  msg: MensajeChatConAutor;
  esPropio: boolean;
  esAdmin: boolean;
  accionPendiente: boolean;
  onReportar: () => void;
  onAprobar: () => void;
  onEliminar: () => void;
}) {
  const esSistema = msg.tipo !== "usuario";

  if (esSistema) {
    return (
      <div className="flex justify-center">
        <p className="max-w-[90%] rounded-full bg-zinc-800/80 px-3 py-1.5 text-center text-[11px] text-zinc-400">
          {msg.contenido}
        </p>
      </div>
    );
  }

  const nombre = msg.autor?.nombre_visible ?? "Compa";
  const hora = formatMexicoTimeShort(msg.created_at);
  const moderado = esAdmin && msg.reportado && !msg.oculto;
  const eliminado = msg.oculto;

  return (
    <article
      className={`group relative flex gap-2 ${
        esPropio ? "flex-row-reverse" : ""
      } ${moderado ? "rounded-xl ring-1 ring-red-500/50 ring-offset-2 ring-offset-zinc-950" : ""}`}
    >
      {!esPropio && !eliminado && (
        <button
          type="button"
          onClick={onReportar}
          disabled={accionPendiente}
          title="Reportar mensaje"
          aria-label="Reportar mensaje"
          className={`absolute top-0 z-10 rounded-md bg-zinc-900/90 px-1.5 py-0.5 text-xs opacity-100 shadow-sm ring-1 ring-zinc-700 transition hover:bg-red-950 hover:ring-red-800/60 disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100 ${
            esPropio ? "left-0" : "right-0"
          }`}
        >
          🚩
        </button>
      )}

      <Avatar
        nombre={nombre}
        avatarUrl={msg.autor?.avatar_url ?? null}
        esPropio={esPropio}
      />
      <div
        className={`flex min-w-0 max-w-[80%] flex-col ${esPropio ? "items-end" : ""}`}
      >
        <div
          className={`mb-0.5 flex items-baseline gap-2 ${
            esPropio ? "flex-row-reverse" : ""
          }`}
        >
          <span className="truncate text-xs font-semibold text-emerald-400/90">
            {nombre}
          </span>
          <time
            dateTime={msg.created_at}
            className="shrink-0 text-[10px] text-zinc-600"
          >
            {hora}
          </time>
        </div>

        <p
          className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
            eliminado
              ? "rounded-tl-sm bg-zinc-800/50 italic text-zinc-500"
              : esPropio
                ? "rounded-tr-sm bg-emerald-700/80 text-white"
                : "rounded-tl-sm bg-zinc-800 text-zinc-100"
          }`}
        >
          {msg.contenido}
        </p>

        {moderado && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-red-400/90">
              {msg.conteo_reportes} reporte{msg.conteo_reportes === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={onAprobar}
              disabled={accionPendiente}
              className="rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-semibold text-emerald-400 ring-1 ring-zinc-700 transition hover:bg-zinc-700 disabled:opacity-40"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={onEliminar}
              disabled={accionPendiente}
              className="rounded-lg bg-red-950/80 px-2 py-1 text-[10px] font-semibold text-red-300 ring-1 ring-red-900/60 transition hover:bg-red-900/50 disabled:opacity-40"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function Avatar({
  nombre,
  avatarUrl,
  esPropio,
}: {
  nombre: string;
  avatarUrl: string | null;
  esPropio: boolean;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={32}
        height={32}
        className={`size-8 shrink-0 rounded-full border-2 object-cover ${
          esPropio ? "border-emerald-500/60" : "border-zinc-700"
        }`}
      />
    );
  }

  return (
    <div
      className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
        esPropio
          ? "border-emerald-500/60 bg-emerald-950 text-emerald-300"
          : "border-zinc-700 bg-zinc-800 text-zinc-300"
      }`}
      aria-hidden
    >
      {getInitials(nombre)}
    </div>
  );
}
