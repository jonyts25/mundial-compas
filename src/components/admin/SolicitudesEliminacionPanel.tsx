"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  aprobarSolicitudEliminacion,
  rechazarSolicitudEliminacion,
} from "@/lib/liga/eliminacion-admin-actions";
import type { SolicitudEliminacionAdminRow } from "@/lib/liga/eliminacion-admin-queries";

function formatSolicitudFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });
}

const ESTATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

interface SolicitudesEliminacionPanelProps {
  solicitudes: SolicitudEliminacionAdminRow[];
}

export function SolicitudesEliminacionPanel({
  solicitudes,
}: SolicitudesEliminacionPanelProps) {
  const router = useRouter();

  if (solicitudes.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-400">
        No hay solicitudes de eliminación registradas.
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-4">
      {solicitudes.map((s) => (
        <SolicitudCard
          key={s.id}
          solicitud={s}
          onDone={() => router.refresh()}
        />
      ))}
    </ul>
  );
}

function SolicitudCard({
  solicitud,
  onDone,
}: {
  solicitud: SolicitudEliminacionAdminRow;
  onDone: () => void;
}) {
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const esPendiente = solicitud.estatus === "pendiente";

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-white">{solicitud.liga_nombre}</h2>
          <p className="text-xs text-zinc-500">
            /grupos/{solicitud.liga_slug}
            {!solicitud.liga_activa && (
              <span className="ml-2 text-amber-500/90">· inactivo</span>
            )}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            solicitud.estatus === "pendiente"
              ? "bg-amber-950/60 text-amber-300"
              : solicitud.estatus === "aprobada"
                ? "bg-emerald-950/60 text-emerald-300"
                : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {ESTATUS_LABEL[solicitud.estatus] ?? solicitud.estatus}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase text-zinc-500">
            Solicitante
          </dt>
          <dd className="text-zinc-300">{solicitud.solicitante_nombre}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-zinc-500">
            Motivo
          </dt>
          <dd className="whitespace-pre-wrap text-zinc-300">{solicitud.motivo}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-zinc-500">
            Fecha solicitud
          </dt>
          <dd className="text-zinc-400">
            {formatSolicitudFecha(solicitud.created_at)}
          </dd>
        </div>
        {solicitud.comentario_revision && (
          <div>
            <dt className="text-[10px] font-bold uppercase text-zinc-500">
              Comentario de revisión
            </dt>
            <dd className="text-zinc-400">{solicitud.comentario_revision}</dd>
          </div>
        )}
        {solicitud.revisado_at && (
          <div>
            <dt className="text-[10px] font-bold uppercase text-zinc-500">
              Revisado
            </dt>
            <dd className="text-zinc-500 text-xs">
              {formatSolicitudFecha(solicitud.revisado_at)}
            </dd>
          </div>
        )}
      </dl>

      {esPendiente && (
        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
          <label className="block text-[10px] font-bold uppercase text-zinc-500">
            Comentario de revisión (opcional)
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            maxLength={500}
            disabled={isPending}
            placeholder="Nota interna para el solicitante…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-600/60"
          />
          {error && (
            <p className="text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const r = await aprobarSolicitudEliminacion(
                    solicitud.id,
                    comentario,
                  );
                  if (r.ok) onDone();
                  else setError(r.error);
                });
              }}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
            >
              {isPending ? "…" : "Aprobar"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const r = await rechazarSolicitudEliminacion(
                    solicitud.id,
                    comentario,
                  );
                  if (r.ok) onDone();
                  else setError(r.error);
                });
              }}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-40"
            >
              Rechazar
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">
            Aprobar desactiva la quiniela (soft-delete). No se borran pronósticos
            ni mensajes.
          </p>
        </div>
      )}
    </li>
  );
}
