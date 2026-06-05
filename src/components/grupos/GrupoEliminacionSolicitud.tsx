"use client";

import { useState, useTransition } from "react";
import { solicitarEliminacionGrupo } from "@/lib/liga/eliminacion-actions";
import type { EliminacionSolicitudRow } from "@/lib/liga/eliminacion-solicitudes";

interface GrupoEliminacionSolicitudProps {
  ligaId: string;
  grupoSlug: string;
  solicitud: EliminacionSolicitudRow | null;
}

export function GrupoEliminacionSolicitud({
  ligaId,
  grupoSlug,
  solicitud,
}: GrupoEliminacionSolicitudProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (solicitud?.estatus === "pendiente" || enviada) {
    return (
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3">
        <p className="text-sm font-medium text-amber-100/90">
          Solicitud enviada. El equipo revisará el caso.
        </p>
        <p className="mt-1 text-xs text-amber-200/60">
          Hay una solicitud de eliminación pendiente de revisión. No se eliminan
          datos automáticamente.
        </p>
      </div>
    );
  }

  if (solicitud?.estatus === "rechazada") {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3">
        <p className="text-sm font-medium text-zinc-200">
          La última solicitud de eliminación fue rechazada.
        </p>
        {solicitud.comentario_revision && (
          <p className="mt-1 text-xs text-zinc-400">
            Comentario: {solicitud.comentario_revision}
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          La quiniela sigue activa. Puedes enviar una nueva solicitud más adelante
          si el equipo lo permite.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-bold text-white">Solicitar eliminación</h3>
      <p className="mt-1 text-xs text-zinc-500">
        No se borra la quiniela desde la app. Owner/admin puede pedir revisión
        al equipo de Mundial Compas.
      </p>
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const r = await solicitarEliminacionGrupo(ligaId, grupoSlug, motivo);
            if (r.ok) {
              setEnviada(true);
              setMotivo("");
            } else {
              setError(r.error);
            }
          });
        }}
      >
        <label className="block text-[10px] font-bold uppercase text-zinc-500">
          Motivo (obligatorio)
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          minLength={10}
          maxLength={500}
          required
          disabled={isPending}
          placeholder="Explica por qué quieren dar de baja esta quiniela…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-600/60"
        />
        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending || motivo.trim().length < 10}
          className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/40 disabled:opacity-40"
        >
          {isPending ? "Enviando…" : "Enviar solicitud"}
        </button>
      </form>
    </div>
  );
}
