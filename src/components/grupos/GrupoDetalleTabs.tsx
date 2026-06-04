"use client";

import { useState } from "react";
import { GrupoAdminSection } from "@/components/grupos/GrupoAdminSection";
import { GrupoMiembrosList } from "@/components/grupos/GrupoMiembrosList";
import { RolBadge } from "@/components/grupos/RolBadge";
import type { GrupoDetalle, GrupoMiembroRow } from "@/lib/liga/grupos-queries";
import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";
import Link from "next/link";

type TabId = "resumen" | "miembros";

interface GrupoDetalleTabsProps {
  grupo: GrupoDetalle;
  slug: string;
  miembros: GrupoMiembroRow[];
  currentUserId: string;
}

export function GrupoDetalleTabs({
  grupo,
  slug,
  miembros,
  currentUserId,
}: GrupoDetalleTabsProps) {
  const [tab, setTab] = useState<TabId>("resumen");

  return (
    <div className="space-y-4">
      <div
        className="flex gap-2 border-b border-zinc-800 pb-2"
        role="tablist"
        aria-label="Secciones del grupo"
      >
        {(
          [
            ["resumen", "Resumen"],
            ["miembros", "Miembros"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === id
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
            {id === "miembros" && (
              <span className="ml-1 text-xs text-zinc-600">
                ({grupo.miembros_count})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <RolBadge rol={grupo.rol} />
        <span className="text-xs text-zinc-600">
          {TIPO_QUINIELA_LABELS[grupo.tipo_quiniela]}
        </span>
      </div>

      {tab === "resumen" ? (
        <>
          {grupo.descripcion && (
            <p className="text-sm text-zinc-400">{grupo.descripcion}</p>
          )}

          {grupo.codigo_invitacion ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Código de invitación
              </p>
              <p className="mt-1 font-mono text-2xl font-black tracking-widest text-emerald-400">
                {grupo.codigo_invitacion}
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                Solo admins del grupo pueden ver este código. Compártelo para
                invitar compas.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-sm text-zinc-500">
              El código de invitación solo lo ven el owner y los admins. Pide a
              un admin que te lo comparta.
            </div>
          )}

          <div className="grid gap-2">
            <Link
              href={`/grupos/${slug}/quiniela`}
              className="rounded-xl bg-emerald-600 py-3 text-center text-sm font-bold text-white"
            >
              Quiniela del grupo
            </Link>
            <Link
              href={`/grupos/${slug}/leaderboard`}
              className="rounded-xl border border-zinc-600 py-3 text-center text-sm font-semibold text-zinc-200"
            >
              Leaderboard del grupo
            </Link>
          </div>

          {(grupo.tipo_quiniela === "por_jornada" ||
            grupo.tipo_quiniela === "por_fase") && (
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
              Filtros avanzados por jornada/fase llegarán pronto. Por ahora se
              muestran todos los partidos abiertos del torneo.
            </p>
          )}

          <GrupoAdminSection puedeAdministrar={grupo.puede_administrar} />
        </>
      ) : (
        <>
          <GrupoMiembrosList
            miembros={miembros}
            currentUserId={currentUserId}
          />
          <GrupoAdminSection puedeAdministrar={grupo.puede_administrar} />
        </>
      )}
    </div>
  );
}
