"use client";

import { useState, useTransition } from "react";
import {
  confirmarRecepcionPago,
  guardarDepositoGanador,
  reportarDepositoRealizado,
} from "@/lib/liga/liquidacion-actions";
import type {
  CompetenciaLigaState,
  LiquidacionPagoRow,
} from "@/lib/liga/competencia-types";

interface TablonLiquidacionProps {
  competencia: CompetenciaLigaState;
  pagos: LiquidacionPagoRow[];
  usuarioId: string;
  /** Solo participantes de quiniela de paga ven el tablón */
  quinielaPaga: boolean;
}

export function TablonLiquidacion({
  competencia,
  pagos,
  usuarioId,
  quinielaPaga,
}: TablonLiquidacionProps) {
  if (!quinielaPaga) return null;
  if (competencia.estado === "activa") return null;

  const esGanador = competencia.ganadorId === usuarioId;
  const [clabe, setClabe] = useState(competencia.ganadorDeposito?.clabe ?? "");
  const [banco, setBanco] = useState(competencia.ganadorDeposito?.banco ?? "");
  const [titular, setTitular] = useState(competencia.ganadorDeposito?.titular ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGuardarDeposito() {
    setMsg(null);
    startTransition(async () => {
      const r = await guardarDepositoGanador(clabe, banco, titular);
      setMsg(r.ok ? "Datos guardados ✓" : r.error);
    });
  }

  function handleReportar(pagoId: string) {
    setMsg(null);
    startTransition(async () => {
      const r = await reportarDepositoRealizado(pagoId);
      setMsg(r.ok ? "Reporte enviado al ganador" : r.error);
    });
  }

  function handleConfirmar(pagoId: string) {
    setMsg(null);
    startTransition(async () => {
      const r = await confirmarRecepcionPago(pagoId);
      setMsg(r.ok ? "Recepción confirmada ✓" : r.error);
    });
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-600/40 bg-gradient-to-b from-amber-950/30 to-zinc-950 shadow-lg">
      <header className="border-b border-amber-800/30 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
          🏆 Ganador inalcanzable
        </p>
        <h2 className="text-lg font-black text-white">
          Tablón de liquidación de pagos
        </h2>
        {competencia.ganadorNombre && (
          <p className="mt-1 text-sm text-zinc-400">
            Campeón:{" "}
            <span className="font-semibold text-amber-200">
              {competencia.ganadorNombre} 👑
            </span>
          </p>
        )}
      </header>

      {esGanador && (
        <div className="border-b border-zinc-800 px-4 py-4">
          <p className="mb-3 text-xs text-zinc-400">
            Captura tus datos para que los compas te depositen el premio:
          </p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="CLABE interbancaria"
              value={clabe}
              onChange={(e) => setClabe(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="Banco"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="Titular de la cuenta"
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={handleGuardarDeposito}
              disabled={isPending}
              className="w-full rounded-lg bg-amber-600 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              Guardar datos de depósito
            </button>
          </div>
        </div>
      )}

      {!esGanador && competencia.ganadorDeposito?.clabe && (
        <div className="border-b border-zinc-800 px-4 py-3 text-xs text-zinc-300">
          <p className="font-semibold text-emerald-400">Datos del ganador</p>
          <p className="mt-1 font-mono">{competencia.ganadorDeposito.clabe}</p>
          <p>{competencia.ganadorDeposito.banco}</p>
          <p>{competencia.ganadorDeposito.titular}</p>
        </div>
      )}

      <ul className="divide-y divide-zinc-800">
        {pagos.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            No hay deudores registrados en la quiniela de honor.
          </li>
        ) : (
          pagos.map((p) => {
            const esDeudor = p.deudor_id === usuarioId;
            const esGanadorViendo = esGanador;

            return (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">
                    {p.deudor_nombre}
                    {esDeudor && (
                      <span className="ml-1 text-[10px] text-zinc-500">(tú)</span>
                    )}
                  </span>
                  <EstadoBadge estado={p.estado} />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {esDeudor && p.estado === "pendiente" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleReportar(p.id)}
                      className="rounded-lg bg-red-900/50 px-3 py-1.5 text-xs font-bold text-red-200 ring-1 ring-red-600/50 hover:bg-red-900"
                    >
                      💸 Ya deposité
                    </button>
                  )}
                  {esGanadorViendo && p.estado === "deposito_reportado" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleConfirmar(p.id)}
                      className="rounded-lg bg-emerald-900/50 px-3 py-1.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-600/50 hover:bg-emerald-900"
                    >
                      ✅ Confirmar recepción
                    </button>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {msg && (
        <p className="border-t border-zinc-800 px-4 py-2 text-center text-xs text-zinc-400">
          {msg}
        </p>
      )}
    </section>
  );
}

function EstadoBadge({
  estado,
}: {
  estado: LiquidacionPagoRow["estado"];
}) {
  if (estado === "confirmado") {
    return (
      <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-600/40">
        ✅ Liquidado
      </span>
    );
  }
  if (estado === "deposito_reportado") {
    return (
      <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-600/40">
        💸 Depósito reportado
      </span>
    );
  }
  return (
    <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-bold text-red-300 ring-1 ring-red-800/50">
      ⏳ Pendiente
    </span>
  );
}
