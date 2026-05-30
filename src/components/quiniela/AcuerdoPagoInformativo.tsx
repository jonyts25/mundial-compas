import type { AcuerdoPago } from "@/lib/liga/acuerdo-pago";
import {
  acuerdoPagoResumen,
  formatFechaLimiteAcuerdo,
  formatMontoAcuerdo,
} from "@/lib/liga/acuerdo-pago";

interface AcuerdoPagoInformativoProps {
  acuerdo: AcuerdoPago | null;
  compact?: boolean;
}

export function AcuerdoPagoInformativo({
  acuerdo,
  compact = false,
}: AcuerdoPagoInformativoProps) {
  if (!acuerdo) {
    return (
      <div
        className={`rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 text-zinc-500 ${
          compact ? "px-3 py-2 text-[11px]" : "px-4 py-3 text-xs"
        }`}
      >
        El monto y la fecha de pago de la quiniela de paga aún no están publicados
        por el moderador del grupo.
      </div>
    );
  }

  if (compact) {
    return (
      <p className="rounded-lg border border-amber-800/30 bg-amber-950/20 px-3 py-2 text-center text-[11px] text-amber-100/90">
        💰 Quiniela de paga: {acuerdoPagoResumen(acuerdo)}
      </p>
    );
  }

  return (
    <section className="mb-4 rounded-2xl border border-amber-600/30 bg-gradient-to-br from-amber-950/40 to-zinc-950 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
        Acuerdo de la bolsa 👑
      </p>
      <p className="mt-2 text-lg font-black text-amber-100">
        {formatMontoAcuerdo(acuerdo)}{" "}
        <span className="text-sm font-semibold text-amber-200/80">por compa</span>
      </p>
      <p className="mt-1 text-sm text-zinc-300">
        Fecha límite de pago al ganador:{" "}
        <strong className="text-white">{formatFechaLimiteAcuerdo(acuerdo)}</strong>
      </p>
      {acuerdo.notas && (
        <p className="mt-2 text-xs text-zinc-500">{acuerdo.notas}</p>
      )}
      <p className="mt-2 text-[10px] text-zinc-600">
        Acuerdo privado entre compas · La app solo informa, no cobra ni retiene fondos.
      </p>
    </section>
  );
}
