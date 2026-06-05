"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { crearGrupoPrivado } from "@/lib/liga/grupos-actions";
import { DisclaimerBlock } from "@/components/legal/DisclaimerBlock";
import { DISCLAIMER_COOPERACHA, DISCLAIMER_QUINIELA_INMUTABLE } from "@/lib/legal/disclaimers";
import {
  MODO_COMPETENCIA_DESCRIPCIONES,
  MODO_COMPETENCIA_LABELS,
  MODOS_COMPETENCIA,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
import {
  TIPO_QUINIELA_DESCRIPCIONES,
  TIPO_QUINIELA_LABELS,
  TIPOS_QUINIELA,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";

export function CrearGrupoForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<TipoQuiniela>("mundial_completo");
  const [modo, setModo] = useState<ModoCompetencia>("honor");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await crearGrupoPrivado({
        nombre,
        descripcion,
        tipoQuiniela: tipo,
        modoCompetencia: modo,
      });
      if (result.ok) {
        router.push(`/grupos/${result.slug}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Nombre de la quiniela
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          minLength={3}
          maxLength={80}
          placeholder="Ej. Los del bar"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Descripción (opcional)
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="Reglas caseras, apuesta simbólica, etc."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Tipo de quiniela
        </legend>
        <div className="space-y-2">
          {TIPOS_QUINIELA.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                tipo === t
                  ? "border-emerald-600/60 bg-emerald-950/30"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={t}
                checked={tipo === t}
                onChange={() => setTipo(t)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-white">
                  {TIPO_QUINIELA_LABELS[t]}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {TIPO_QUINIELA_DESCRIPCIONES[t]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Modo entre amigos
        </legend>
        <p className="mb-2 text-xs text-zinc-600">
          La app no procesa dinero ni apuestas reales; solo control social
          simbólico.
        </p>
        <div className="space-y-2">
          {MODOS_COMPETENCIA.map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                modo === m
                  ? "border-violet-600/60 bg-violet-950/30"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="modo"
                value={m}
                checked={modo === m}
                onChange={() => setModo(m)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-white">
                  {MODO_COMPETENCIA_LABELS[m]}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {MODO_COMPETENCIA_DESCRIPCIONES[m]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <DisclaimerBlock
        title="Importante"
        body={DISCLAIMER_QUINIELA_INMUTABLE}
        compact
      />

      {modo === "cooperacion" && (
        <DisclaimerBlock title="Cooperacha" body={DISCLAIMER_COOPERACHA} compact />
      )}

      {error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {isPending ? "Creando…" : "Crear quiniela"}
      </button>
    </form>
  );
}
