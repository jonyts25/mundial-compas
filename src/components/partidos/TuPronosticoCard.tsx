"use client";

import { useEffect, useState, useTransition } from "react";
import { ScoreInput, type ScoreValue } from "@/components/quiniela/ScoreInput";
import { trackEvent } from "@/lib/analytics/track";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { savePronostico } from "@/lib/quiniela/actions";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
import type { Partido, PronosticoPartido } from "@/types/database";

type SaveUiState = "idle" | "saving" | "saved" | "error";

export interface SavedPronosticoSnapshot {
  goles_local: number;
  goles_visitante: number;
  puntos: number;
}

interface TuPronosticoCardProps {
  partido: Partido;
  pronostico: PronosticoPartido | null;
  ligaId?: string;
  ligaScope?: "global" | "grupo";
  onPronosticoSaved?: (pronostico: SavedPronosticoSnapshot) => void;
}

function initialScore(
  pronostico: PronosticoPartido | null,
  side: "local" | "visitante",
): ScoreValue {
  if (!pronostico) return null;
  return side === "local" ? pronostico.goles_local : pronostico.goles_visitante;
}

export function TuPronosticoCard({
  partido,
  pronostico: pronosticoProp,
  ligaId = LIGA_GLOBAL_ID,
  ligaScope: ligaScopeProp,
  onPronosticoSaved,
}: TuPronosticoCardProps) {
  const ligaScope: "global" | "grupo" =
    ligaScopeProp ??
    (!ligaId || ligaId === LIGA_GLOBAL_ID ? "global" : "grupo");
  const [pronostico, setPronostico] = useState(pronosticoProp);
  const [local, setLocal] = useState<ScoreValue>(() =>
    initialScore(pronosticoProp, "local"),
  );
  const [visitante, setVisitante] = useState<ScoreValue>(() =>
    initialScore(pronosticoProp, "visitante"),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [saveUi, setSaveUi] = useState<SaveUiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lockedByKickoff = isPronosticoLocked(partido.fecha_kickoff, nowMs);
  const lockedByStatus =
    partido.estatus !== "programado" && partido.estatus !== "aplazado";
  const locked = lockedByKickoff || lockedByStatus;

  const savedLocal = pronostico?.goles_local ?? null;
  const savedVisitante = pronostico?.goles_visitante ?? null;
  const dirty = local !== savedLocal || visitante !== savedVisitante;
  const canSave =
    !locked && local !== null && visitante !== null && local >= 0 && visitante >= 0;

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (saveUi !== "saved") return;
    const id = window.setTimeout(() => setSaveUi("idle"), 2500);
    return () => window.clearTimeout(id);
  }, [saveUi]);

  function handleSave() {
    if (local === null || visitante === null) {
      setErrorMessage("Ingresa ambos marcadores");
      setSaveUi("error");
      return;
    }

    setErrorMessage(null);
    setSaveUi("saving");
    const hadPronostico = Boolean(pronostico);

    startTransition(async () => {
      const result = await savePronostico(partido.id, local, visitante, ligaId);
      if (result.ok) {
        const analyticsBase = {
          liga_scope: ligaScope,
          partido_id: partido.id,
          source: "match_detail" as const,
        };
        if (hadPronostico) {
          trackEvent("prediction_updated", analyticsBase);
        } else {
          trackEvent("pronostico_saved", analyticsBase);
        }

        const snapshot: SavedPronosticoSnapshot = {
          goles_local: local,
          goles_visitante: visitante,
          puntos: pronostico?.puntos ?? 0,
        };
        setPronostico({
          id: pronostico?.id ?? "",
          goles_local: local,
          goles_visitante: visitante,
          puntos: snapshot.puntos,
        });
        setSaveUi("saved");
        onPronosticoSaved?.(snapshot);
      } else {
        setErrorMessage(result.error);
        setSaveUi("error");
      }
    });
  }

  const saving = saveUi === "saving" || isPending;

  return (
    <section
      className="rounded-2xl border border-emerald-500/25 bg-zinc-900/50 px-4 py-4 shadow-sm"
      aria-label="Tu pronóstico"
    >
      <h2 className="text-sm font-bold text-emerald-200">Tu pronóstico</h2>

      {pronostico && !locked && (
        <p className="mt-1 text-xs text-zinc-400">
          Tu pronóstico actual:{" "}
          <span className="font-semibold tabular-nums text-zinc-200">
            {pronostico.goles_local}-{pronostico.goles_visitante}
          </span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <span className="max-w-[5.5rem] truncate text-right text-xs font-semibold text-zinc-300 sm:max-w-[7rem] sm:text-sm">
          {partido.equipo_local_nombre}
        </span>
        <ScoreInput
          key={`local-${savedLocal ?? "none"}`}
          value={local}
          onChange={setLocal}
          disabled={locked}
          compact
          aria-label={`Goles ${partido.equipo_local_nombre}`}
        />
        <span className="text-sm font-bold text-zinc-500">-</span>
        <ScoreInput
          key={`away-${savedVisitante ?? "none"}`}
          value={visitante}
          onChange={setVisitante}
          disabled={locked}
          compact
          aria-label={`Goles ${partido.equipo_visitante_nombre}`}
        />
        <span className="max-w-[5.5rem] truncate text-left text-xs font-semibold text-zinc-300 sm:max-w-[7rem] sm:text-sm">
          {partido.equipo_visitante_nombre}
        </span>
      </div>

      {locked ? (
        <p className="mt-3 text-center text-xs text-zinc-500">
          {lockedByStatus
            ? "Este partido ya no acepta pronósticos."
            : "Este partido ya cerró pronósticos."}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty || !canSave}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Guardando…"
            : pronostico
              ? "Actualizar pronóstico"
              : "Guardar pronóstico"}
        </button>
      )}

      {saveUi === "saved" && (
        <p className="mt-2 text-center text-xs font-medium text-emerald-400" role="status">
          Guardado ✓
        </p>
      )}

      {saveUi === "error" && errorMessage && (
        <div className="mt-2 text-center">
          <p className="text-xs text-red-400" role="alert">
            {errorMessage}
          </p>
          {!locked && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canSave}
              className="mt-1 text-xs font-semibold text-red-300 underline hover:text-red-200"
            >
              Reintentar
            </button>
          )}
        </div>
      )}
    </section>
  );
}
