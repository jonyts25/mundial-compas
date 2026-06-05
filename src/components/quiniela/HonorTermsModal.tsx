"use client";

/** @deprecated Modal de Contrato de Honor / quiniela de paga global (retirado). */

import { useEffect, useState, useTransition } from "react";
import { HonorTermsDisclaimer } from "@/components/auth/HonorTermsDisclaimer";
import { acceptHonorTerms } from "@/lib/auth/honor-actions";
import type { AcuerdoPago } from "@/lib/liga/acuerdo-pago";
import {
  formatFechaLimiteAcuerdo,
  formatMontoAcuerdo,
} from "@/lib/liga/acuerdo-pago";

interface HonorTermsModalProps {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
  acuerdoPago: AcuerdoPago | null;
}

export function HonorTermsModal({
  open,
  onClose,
  onAccepted,
  acuerdoPago,
}: HonorTermsModalProps) {
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setAcepto(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleAccept() {
    if (!acepto) {
      setError("Debes marcar la casilla de aceptación");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await acceptHonorTerms();
      if (result.ok) {
        onAccepted();
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="honor-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-emerald-600/50 bg-zinc-950 shadow-2xl shadow-emerald-900/30 ring-1 ring-emerald-500/20">
        <div className="border-b border-emerald-900/50 bg-gradient-to-r from-emerald-950 via-zinc-950 to-zinc-950 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
            Contrato de Honor entre Compas
          </p>
          <h2 id="honor-modal-title" className="mt-1 text-xl font-black text-white">
            Entrar a la Quiniela de Paga
          </h2>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="honor-blink rounded-lg border-2 border-red-600 bg-red-950/60 px-4 py-3 text-center text-sm font-bold leading-snug text-red-300">
            Compromiso moral y de reputación: al terminar el torneo depositarás el{" "}
            <span className="underline decoration-wavy decoration-red-400">
              100% del monto acordado
            </span>{" "}
            al ganador de la quiniela de paga. No es opcional. Es palabra de compa.
          </p>

          {acuerdoPago ? (
            <div className="rounded-xl border border-amber-600/40 bg-amber-950/30 px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Acuerdo vigente del grupo
              </p>
              <p className="mt-1 text-xl font-black text-amber-100">
                {formatMontoAcuerdo(acuerdoPago)} por compa
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Pago al ganador antes del{" "}
                <strong>{formatFechaLimiteAcuerdo(acuerdoPago)}</strong>
              </p>
              {acuerdoPago.notas && (
                <p className="mt-2 text-xs text-zinc-500">{acuerdoPago.notas}</p>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-center text-xs text-zinc-400">
              El moderador aún no publica monto y fecha. Al aceptar te comprometes al
              monto que el grupo defina en el chat.
            </p>
          )}

          <HonorTermsDisclaimer id="honor-modal-disclaimer" />

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/80 p-3">
            <input
              type="checkbox"
              checked={acepto}
              onChange={(e) => setAcepto(e.target.checked)}
              className="mt-1 size-4 rounded border-zinc-600 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-200">
              Leí y acepto el Contrato de Honor. Entiendo que recibiré el badge{" "}
              <span className="text-amber-400">👑</span> en el liderato y que la app
              facilitará el tablón público de liquidación al cierre.
            </span>
          </label>

          {error && (
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending || !acepto}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Activando…" : "Aceptar y jugar 👑"}
          </button>
        </div>
      </div>
    </div>
  );
}
