"use client";

/** @deprecated Panel moderador para acuerdo de paga global (sin página que lo use). */

import { useState, useTransition } from "react";
import { guardarAcuerdoPago } from "@/lib/liga/acuerdo-actions";
import type { AcuerdoPago } from "@/lib/liga/acuerdo-pago";
import { formatFechaLimiteAcuerdo, formatMontoAcuerdo } from "@/lib/liga/acuerdo-pago";

interface ModeradorAcuerdoPanelProps {
  acuerdoActual: AcuerdoPago | null;
}

export function ModeradorAcuerdoPanel({ acuerdoActual }: ModeradorAcuerdoPanelProps) {
  const [monto, setMonto] = useState(
    acuerdoActual ? String(acuerdoActual.montoPorCompa) : "",
  );
  const [fecha, setFecha] = useState(acuerdoActual?.fechaLimitePago ?? "");
  const [notas, setNotas] = useState(acuerdoActual?.notas ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await guardarAcuerdoPago(
        Number(monto),
        fecha,
        notas || undefined,
      );
      setMsg(r.ok ? "Acuerdo publicado en la liga ✓" : r.error);
    });
  }

  return (
    <section className="mb-4 rounded-2xl border-2 border-red-800/40 bg-red-950/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-red-300">
        Panel moderador
      </p>
      <h2 className="mt-1 text-sm font-bold text-white">
        Definir monto y fecha de la quiniela de paga
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Se mostrará en el contrato de honor, quiniela y liderato. Se anuncia en el
        chat general.
      </p>

      {acuerdoActual && (
        <p className="mt-2 text-xs text-amber-200/80">
          Vigente: {formatMontoAcuerdo(acuerdoActual)} · antes del{" "}
          {formatFechaLimiteAcuerdo(acuerdoActual)}
        </p>
      )}

      <form onSubmit={handleSave} className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-zinc-400">
              Monto por compa (MXN)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-zinc-400">
              Pagar antes de
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
            />
          </div>
        </div>
        <input
          type="text"
          placeholder="Notas opcionales (ej. transferencia, CLABE grupal…)"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-red-800 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "Publicando…" : "Publicar acuerdo"}
        </button>
        {msg && (
          <p
            className={`text-center text-xs ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}
          >
            {msg}
          </p>
        )}
      </form>
    </section>
  );
}
