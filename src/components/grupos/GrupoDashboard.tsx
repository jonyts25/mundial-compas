"use client";

import Link from "next/link";
import { useState } from "react";
import { GrupoConfigPanel } from "@/components/grupos/GrupoConfigPanel";
import { GrupoInvitarPanel } from "@/components/grupos/GrupoInvitarPanel";
import { GrupoMiembrosList } from "@/components/grupos/GrupoMiembrosList";
import { RolBadge } from "@/components/grupos/RolBadge";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { GrupoChat } from "@/components/grupos/GrupoChat";
import { QuinielaList } from "@/components/quiniela/QuinielaList";
import type { LeaderboardRow } from "@/lib/leaderboard/queries";
import type { EliminacionSolicitudRow } from "@/lib/liga/eliminacion-solicitudes";
import type { GrupoDetalle, GrupoMiembroRow } from "@/lib/liga/grupos-queries";
import {
  MODO_COMPETENCIA_LABELS,
} from "@/lib/liga/modo-competencia";
import { DisclaimerBlock } from "@/components/legal/DisclaimerBlock";
import { DISCLAIMER_ADMIN_GRUPO } from "@/lib/legal/disclaimers";
import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";
import type { MensajeChatConAutor } from "@/types/chat";
import type { QuinielaPageData } from "@/lib/quiniela/queries";
import type { Usuario } from "@/types/database";

type TabId =
  | "resumen"
  | "quiniela"
  | "leaderboard"
  | "chat"
  | "miembros"
  | "invitar"
  | "configuracion";

interface GrupoDashboardProps {
  grupo: GrupoDetalle;
  slug: string;
  miembros: GrupoMiembroRow[];
  currentUserId: string;
  quinielaData: QuinielaPageData;
  leaderboardFilas: LeaderboardRow[];
  chatMensajes: MensajeChatConAutor[];
  usuario: Usuario;
  solicitudEliminacion: EliminacionSolicitudRow | null;
  solicitudConfig: EliminacionSolicitudRow | null;
  initialTab?: string;
}

export function GrupoDashboard({
  grupo,
  slug,
  miembros,
  currentUserId,
  quinielaData,
  leaderboardFilas,
  chatMensajes,
  usuario,
  solicitudEliminacion,
  solicitudConfig,
  initialTab,
}: GrupoDashboardProps) {
  const defaultTab: TabId =
    initialTab &&
    (
      [
        "resumen",
        "quiniela",
        "leaderboard",
        "chat",
        "miembros",
        "invitar",
        "configuracion",
      ] as const
    ).includes(initialTab as TabId)
      ? (initialTab as TabId)
      : "resumen";

  const [tab, setTab] = useState<TabId>(defaultTab);

  const tabs: { id: TabId; label: string; adminOnly?: boolean }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "quiniela", label: "Quiniela" },
    { id: "leaderboard", label: "Liderato" },
    { id: "chat", label: "Chat" },
    { id: "miembros", label: "Miembros" },
    {
      id: "invitar",
      label: "Invitar",
      adminOnly: false,
    },
    { id: "configuracion", label: "Config", adminOnly: true },
  ];

  const visibleTabs = tabs.filter(
    (t) => !t.adminOnly || grupo.puede_administrar,
  );

  return (
    <div className="space-y-4">
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Dashboard del grupo"
      >
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              tab === t.id
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {t.label}
            {t.id === "miembros" && (
              <span className="ml-1 opacity-80">({grupo.miembros_count})</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <RolBadge rol={grupo.rol} />
        <span className="text-xs text-zinc-500">
          {TIPO_QUINIELA_LABELS[grupo.tipo_quiniela]} ·{" "}
          {MODO_COMPETENCIA_LABELS[grupo.modo_competencia]}
        </span>
      </div>

      <DisclaimerBlock title="Tu quiniela privada" body={DISCLAIMER_ADMIN_GRUPO} compact />

      {solicitudEliminacion?.estatus === "pendiente" && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3">
          <p className="text-sm text-amber-100/90">
            Hay una solicitud de eliminación pendiente de revisión.
          </p>
        </div>
      )}

      {tab === "resumen" && (
        <>
          {grupo.descripcion && (
            <p className="text-sm text-zinc-400">{grupo.descripcion}</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-3">
              <p className="text-lg font-black text-white">
                {grupo.miembros_count}
              </p>
              <p className="text-[10px] uppercase text-zinc-500">Miembros</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-3">
              <p className="text-lg font-black text-emerald-400">
                {Object.keys(quinielaData.pronosticosPorPartido).length}
              </p>
              <p className="text-[10px] uppercase text-zinc-500">Tus picks</p>
            </div>
          </div>
          <div className="grid gap-2">
            <Link
              href={`/grupos/${slug}/quiniela`}
              className="rounded-xl bg-emerald-600 py-3 text-center text-sm font-bold text-white"
            >
              Ir a quiniela completa
            </Link>
            <Link
              href={`/grupos/${slug}/leaderboard`}
              className="rounded-xl border border-zinc-600 py-3 text-center text-sm font-semibold text-zinc-200"
            >
              Ver liderato completo
            </Link>
          </div>
        </>
      )}

      {tab === "quiniela" && (
        <>
          <p className="text-xs text-zinc-500">
            Vista rápida. Usa filtros en la pantalla completa si tu grupo es por
            jornada o fase.
          </p>
          <Link
            href={`/grupos/${slug}/quiniela`}
            className="block text-center text-sm font-semibold text-emerald-500 hover:underline"
          >
            Abrir quiniela con filtros →
          </Link>
          <QuinielaList
            partidos={quinielaData.partidos}
            pronosticosPorPartido={quinielaData.pronosticosPorPartido}
            ligaId={grupo.id}
            tipoQuiniela={grupo.tipo_quiniela}
          />
        </>
      )}

      {tab === "chat" && (
        <>
          <p className="text-xs text-zinc-500">
            Chat privado de la quiniela.{" "}
            {miembros
              .filter((m) => m.rol === "owner" || m.rol === "admin")
              .map((m) => m.nombre_visible)
              .join(", ") || "Sin admins"}
            {" "}
            pueden moderar.
          </p>
          <GrupoChat
            ligaId={grupo.id}
            grupoSlug={slug}
            grupoNombre={grupo.nombre}
            usuario={usuario}
            puedeAdministrar={grupo.puede_administrar}
            grupoActivo={grupo.activa}
            initialMessages={chatMensajes}
          />
        </>
      )}

      {tab === "leaderboard" && (
        <>
          <p className="mb-3 text-xs text-zinc-500">
            Vista previa acumulada. Usa la pantalla completa para filtrar por
            jornada, fase o día.
          </p>
          <Leaderboard
            filas={leaderboardFilas}
            usuarioActualId={currentUserId}
            mostrarBadgeQuinielaPaga={false}
          />
          {leaderboardFilas.length === 0 && (
            <p className="text-center text-sm text-zinc-500">
              Aún no hay puntos en este grupo.
            </p>
          )}
          <Link
            href={`/grupos/${slug}/leaderboard`}
            className="mt-2 block text-center text-sm text-emerald-500 hover:underline"
          >
            Pantalla completa de liderato →
          </Link>
        </>
      )}

      {tab === "miembros" && (
        <GrupoMiembrosList miembros={miembros} currentUserId={currentUserId} />
      )}

      {tab === "invitar" && (
        <GrupoInvitarPanel
          nombre={grupo.nombre}
          codigoInvitacion={grupo.codigo_invitacion}
          rol={grupo.rol}
        />
      )}

      {tab === "configuracion" && grupo.puede_administrar && (
        <GrupoConfigPanel
          ligaId={grupo.id}
          grupoSlug={slug}
          tipoQuiniela={grupo.tipo_quiniela}
          modoCompetencia={grupo.modo_competencia}
          activa={grupo.activa}
          solicitudEliminacion={solicitudConfig}
        />
      )}
    </div>
  );
}
