"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HonorTermsModal } from "@/components/quiniela/HonorTermsModal";
import type { AcuerdoPago } from "@/lib/liga/acuerdo-pago";

interface QuinielaHonorBannerProps {
  quinielaPaga: boolean;
  acuerdoPago: AcuerdoPago | null;
}

/** Opt-in a la bolsa de paga (no bloquea pronósticos gratuitos). */
export function QuinielaHonorBanner({
  quinielaPaga,
  acuerdoPago,
}: QuinielaHonorBannerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  if (quinielaPaga) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/80 via-zinc-900 to-emerald-950/60 px-4 py-4 text-left shadow-lg ring-1 ring-amber-400/20 transition hover:border-amber-400/70 active:scale-[0.99]"
      >
        <span className="text-2xl" aria-hidden>
          🏆
        </span>
        <span className="flex-1">
          <span className="block text-sm font-black text-amber-200">
            Unirse a la Quiniela de Paga
          </span>
          <span className="mt-0.5 block text-[11px] text-zinc-400">
            Juegas gratis ya · La bolsa y liquidación son solo para quien acepte el
            Contrato de Honor
          </span>
        </span>
        <span className="text-lg text-emerald-400" aria-hidden>
          →
        </span>
      </button>

      <HonorTermsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAccepted={() => router.refresh()}
        acuerdoPago={acuerdoPago}
      />
    </>
  );
}
