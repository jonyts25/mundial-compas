"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  InvitePreviewCard,
  type InvitePreviewData,
} from "@/components/grupos/InvitePreviewCard";
import {
  previewGrupoPorCodigo,
  unirseGrupoPorCodigo,
} from "@/lib/liga/grupos-actions";
import type { ModoCompetencia } from "@/lib/liga/modo-competencia";
import type { TipoQuiniela } from "@/lib/liga/tipo-quiniela";

export interface UnirsePreviewInitial {
  nombre: string;
  slug: string;
  tipoQuiniela: TipoQuiniela;
  modoCompetencia: ModoCompetencia;
  miembrosCount: number;
  ownerNombre?: string;
}

interface UnirseGrupoFormProps {
  codigoInicial?: string;
  initialPreview?: UnirsePreviewInitial | null;
  initialError?: string | null;
}

function toPreviewData(p: UnirsePreviewInitial): InvitePreviewData {
  return {
    nombre: p.nombre,
    tipoQuiniela: p.tipoQuiniela,
    modoCompetencia: p.modoCompetencia,
    miembrosCount: p.miembrosCount,
    ownerNombre: p.ownerNombre,
  };
}

export function UnirseGrupoForm({
  codigoInicial = "",
  initialPreview = null,
  initialError = null,
}: UnirseGrupoFormProps) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(codigoInicial.toUpperCase());
  const [preview, setPreview] = useState<UnirsePreviewInitial | null>(
    initialPreview,
  );
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();

  function cargarPreview(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 4) return;

    setError(null);
    startTransition(async () => {
      const result = await previewGrupoPorCodigo(trimmed);
      if (result.ok && result.nombre && result.slug && result.tipo_quiniela) {
        setPreview({
          nombre: result.nombre,
          slug: result.slug,
          tipoQuiniela: result.tipo_quiniela,
          modoCompetencia: result.modo_competencia ?? "honor",
          miembrosCount: result.miembros_count ?? 0,
          ownerNombre: result.owner_nombre,
        });
      } else {
        setPreview(null);
        setError(result.error ?? "Código no encontrado");
      }
    });
  }

  useEffect(() => {
    if (initialPreview || initialError) return;
    if (codigoInicial.trim().length >= 4) cargarPreview(codigoInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {preview ? (
        <InvitePreviewCard
          preview={toPreviewData(preview)}
          showJoinCta
          onJoin={unirse}
          joinPending={isPending}
          joinLabel="Unirme a esta quiniela"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-6 text-center">
          <p className="text-2xl" aria-hidden>
            👥
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Pega el código que te mandó tu compa o abre el enlace de invitación.
          </p>
        </div>
      )}

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
            setError(null);
          }}
          placeholder="Ej. AB12CD34"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-lg tracking-widest text-white uppercase placeholder:text-zinc-600"
          autoComplete="off"
        />
      </div>

      <button
        type="button"
        onClick={() => cargarPreview(codigo)}
        disabled={isPending || codigo.trim().length < 4}
        className="w-full rounded-xl border border-zinc-600 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
      >
        {isPending ? "Buscando…" : "Ver quiniela"}
      </button>

      {error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
