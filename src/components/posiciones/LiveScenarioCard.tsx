"use client";

import { useEffect, useState } from "react";
import {
  detectFifaScenarioChanges,
  type LiveScenarioCardModel,
  type LiveSnapshotState,
} from "@/lib/world-cup/fifa-live-scenarios";

const STORAGE_KEY = "mc-posiciones-scenario-state";

interface LiveScenarioCardProps {
  initial: LiveScenarioCardModel;
  enabled: boolean;
}

function loadPreviousState(): LiveSnapshotState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LiveSnapshotState;
  } catch {
    return null;
  }
}

function saveState(state: LiveSnapshotState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function mergeWithClientChanges(
  initial: LiveScenarioCardModel,
  prev: LiveSnapshotState | null,
): LiveScenarioCardModel {
  if (!prev || prev.fingerprint === initial.snapshotState.fingerprint) {
    return initial;
  }

  const changes = detectFifaScenarioChanges(prev, initial.snapshotState);
  const statements = [...initial.statements];

  if (changes.length === 0) {
    const focus = initial.snapshotState.positions.MEX;
    if (focus?.position === 1) {
      statements.unshift(
        `${focus.teamName} mantiene el liderato del Grupo ${focus.groupKey}.`,
      );
      const opp = initial.snapshotState.opponents.MEX;
      if (opp) {
        statements.push(`Su rival provisional sigue siendo ${opp.label}.`);
      }
    }
    statements.push(
      "No hubo cambios de clasificación desde la última actualización.",
    );
  }

  return {
    ...initial,
    changes,
    statements: [...changes.map((c) => c.text), ...statements],
  };
}

export function LiveScenarioCard({ initial, enabled }: LiveScenarioCardProps) {
  const [model, setModel] = useState(initial);

  useEffect(() => {
    if (!enabled) return;
    const prev = loadPreviousState();
    setModel(mergeWithClientChanges(initial, prev));
    saveState(initial.snapshotState);
  }, [initial, enabled]);

  if (!enabled) return null;

  const hasActivity = model.groupSummaries.length > 0;
  if (!hasActivity) return null;

  return (
    <section
      className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 px-4 py-3"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-emerald-100">Escenario en vivo</h2>
          <p className="mt-0.5 text-[10px] text-emerald-200/60">
            Tabla y cruces según reglamento FIFA ·{" "}
            {model.isProvisional ? "provisional" : "confirmado"}
            {model.scenarioKey ? ` · Anexo C: ${model.scenarioKey}` : ""}
          </p>
        </div>
        {model.changes.length > 0 && (
          <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
            {model.changes.length} cambio{model.changes.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-emerald-50/90">
        {model.statements.slice(0, 8).map((line) => (
          <li key={line.slice(0, 48)} className="flex gap-2">
            <span className="text-emerald-500/80">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {model.qualifyingThirds.length > 0 && (
        <p className="mt-3 border-t border-emerald-800/50 pt-2 text-[10px] text-emerald-200/50">
          Mejores terceros provisionales:{" "}
          {model.qualifyingThirds
            .slice(0, 8)
            .map((t) => `${t.teamName} (${t.groupKey})`)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
