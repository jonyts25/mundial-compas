"use client";

import { useCallback, useMemo, useState } from "react";
import { InvitePreviewCard } from "@/components/grupos/InvitePreviewCard";
import {
  buildInvitePath,
  buildInviteQrUrl,
  buildInviteUrl,
  buildWhatsAppInviteMessage,
  buildWhatsAppShareUrl,
  canUseNativeShare,
  copyTextToClipboard,
  shareInviteNative,
} from "@/lib/grupos/invite-share";
import { isOwnerOrAdmin, type RolLiga } from "@/lib/liga/roles";
import type { ModoCompetencia } from "@/lib/liga/modo-competencia";
import type { TipoQuiniela } from "@/lib/liga/tipo-quiniela";

type FeedbackKind = "codigo" | "link" | "share" | "error" | null;

interface GrupoInvitarPanelProps {
  nombre: string;
  codigoInvitacion: string | null;
  rol: RolLiga;
  tipoQuiniela: TipoQuiniela;
  modoCompetencia: ModoCompetencia;
  miembrosCount: number;
  activa: boolean;
  ownerNombre?: string | null;
}

export function GrupoInvitarPanel({
  nombre,
  codigoInvitacion,
  rol,
  tipoQuiniela,
  modoCompetencia,
  miembrosCount,
  activa,
  ownerNombre,
}: GrupoInvitarPanelProps) {
  const puedeInvitar = isOwnerOrAdmin(rol);
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [busy, setBusy] = useState(false);

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );

  const showFeedback = useCallback((kind: FeedbackKind) => {
    setFeedback(kind);
    window.setTimeout(() => setFeedback(null), 2500);
  }, []);

  if (!puedeInvitar) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
        Solo el owner o un admin pueden ver el código y compartir invitaciones.
        Pide a un admin de <strong className="text-zinc-400">{nombre}</strong>.
      </div>
    );
  }

  if (!codigoInvitacion) {
    return <p className="text-sm text-zinc-500">Código no disponible.</p>;
  }

  const codigo = codigoInvitacion.trim().toUpperCase();
  const invitePath = buildInvitePath(codigo);
  const inviteUrl = origin ? buildInviteUrl(codigo, origin) : invitePath;

  const sharePayload = {
    nombre,
    codigo,
    tipoQuiniela,
    modoCompetencia,
    miembrosCount,
    origin,
  };

  async function handleCopyCodigo() {
    const ok = await copyTextToClipboard(codigo);
    showFeedback(ok ? "codigo" : "error");
  }

  async function handleCopyLink() {
    const ok = await copyTextToClipboard(inviteUrl);
    showFeedback(ok ? "link" : "error");
  }

  async function handleShare() {
    if (!activa) return;
    setBusy(true);
    try {
      if (canUseNativeShare()) {
        const result = await shareInviteNative(sharePayload);
        if (result === "shared") showFeedback("share");
        else if (result === "failed") {
          window.open(buildWhatsAppShareUrl(buildWhatsAppInviteMessage(sharePayload)), "_blank");
          showFeedback("share");
        }
      } else {
        window.open(buildWhatsAppShareUrl(buildWhatsAppInviteMessage(sharePayload)), "_blank");
        showFeedback("share");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!activa && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
          Esta quiniela está inactiva. Los enlaces y códigos ya no permiten unirse.
        </div>
      )}

      <InvitePreviewCard
        preview={{
          nombre,
          tipoQuiniela,
          modoCompetencia,
          miembrosCount,
          ownerNombre,
        }}
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Código para tus compas
        </p>
        <p className="mt-2 font-mono text-3xl font-black tracking-[0.2em] text-emerald-400">
          {codigo}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Compártelo por WhatsApp o pégalo en «Unirme con código».
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={handleCopyCodigo}
          disabled={!activa}
          className="rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-40"
        >
          Copiar código
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          disabled={!activa}
          className="rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-40"
        >
          Copiar enlace
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={!activa || busy}
          className="rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white shadow-md shadow-emerald-950/40 transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? "Abriendo…" : "Compartir"}
        </button>
      </div>

      {feedback === "codigo" && (
        <p className="text-center text-sm font-medium text-emerald-400">
          ✓ Código copiado
        </p>
      )}
      {feedback === "link" && (
        <p className="text-center text-sm font-medium text-emerald-400">
          ✓ Link copiado
        </p>
      )}
      {feedback === "share" && (
        <p className="text-center text-sm font-medium text-emerald-400">
          ✓ Listo para compartir
        </p>
      )}
      {feedback === "error" && (
        <p className="text-center text-sm text-red-400">
          No se pudo copiar. Intenta de nuevo o comparte manualmente.
        </p>
      )}

      {activa && origin && (
        <div className="flex flex-col items-center rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-4">
          <p className="text-[10px] font-bold uppercase text-zinc-500">
            Escanea para unirte
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={buildInviteQrUrl(inviteUrl)}
            alt={`QR invitación ${nombre}`}
            width={140}
            height={140}
            className="mt-2 rounded-lg bg-white p-1"
          />
          <p className="mt-2 max-w-full break-all text-center font-mono text-[10px] text-zinc-600">
            {inviteUrl}
          </p>
        </div>
      )}
    </div>
  );
}
