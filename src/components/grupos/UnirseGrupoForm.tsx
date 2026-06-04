"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  previewGrupoPorCodigo,
  unirseGrupoPorCodigo,
} from "@/lib/liga/grupos-actions";
import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";

export function UnirseGrupoForm() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [preview, setPreview] = useState<{
    nombre: string;
    tipo: string;
    miembros: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buscarPreview() {
    setError(null);
    setPreview(null);
    startTransition(async () => {
      const result = await previewGrupoPorCodigo(codigo);
      if (result.ok && result.nombre) {
        setPreview({
          nombre: result.nombre,
          tipo: result.tipo_quiniela
            ? TIPO_QUINIELA_LABELS[result.tipo_quiniela]
            : "Mundial completo",
          miembros: result.miembros_count ?? 0,
        });
      } else {
        setError(result.error ?? "Código no encontrado");
      }
    });
  }

  function unirse() {
    setError(null);
    startTransition(async () => {
      const result = await unirseGrupoPorCodigo(codigo);
      if (result.ok) {
        router.push(`/grupos/${result.slug}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Código de invitación
        </label>
        <input
          type="text"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.toUpperCase());
            setPreview(null);
          }}
          placeholder="Ej. AB12CD34"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-lg tracking-widest text-white uppercase placeholder:text-zinc-600"
          autoComplete="off"
        />
      </div>

      <button
        type="button"
        onClick={buscarPreview}
        disabled={isPending || codigo.trim().length < 4}
        className="w-full rounded-xl border border-zinc-600 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
      >
        Verificar código
      </button>

      {preview && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
          <p className="text-sm font-bold text-white">{preview.nombre}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {preview.tipo} · {preview.miembros} compa
            {preview.miembros === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            onClick={unirse}
            disabled={isPending}
            className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-500"
          >
            Unirme al grupo
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
