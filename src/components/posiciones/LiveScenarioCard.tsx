"use client";

import { useEffect, useMemo, useState } from "react";
import {
  detectFifaScenarioChanges,
  filterChangesForGroup,
  getGroupContextForLetter,
  type LiveScenarioCardModel,
  type LiveSnapshotState,
} from "@/lib/world-cup/fifa-live-scenarios";
import {
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";

const STORAGE_KEY = "mc-posiciones-scenario-state";

interface LiveScenarioCardProps {
  initial: LiveScenarioCardModel;
  enabled: boolean;
  activeGroup: WorldCupGroupLetter;
  onActiveGroupChange: (group: WorldCupGroupLetter) => void;
  showGroupContext?: boolean;
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
  if (changes.length === 0) return initial;

  return {
    ...initial,
    changes,
    statements: [...changes.map((c) => c.text), ...initial.statements],
  };
}

export function LiveScenarioCard({
  initial,
  enabled,
  activeGroup,
  onActiveGroupChange,
  showGroupContext = true,
}: LiveScenarioCardProps) {
  const [model, setModel] = useState(initial);

  useEffect(() => {
    if (!enabled) return;
    const prev = loadPreviousState();
    setModel(mergeWithClientChanges(initial, prev));
    saveState(initial.snapshotState);
  }, [initial, enabled]);

  const groupView = useMemo(
    () =>
      showGroupContext ? getGroupContextForLetter(model, activeGroup) : null,
    [model, activeGroup, showGroupContext],
  );

  const groupChanges = useMemo(() => {
    const summary = model.groupSummaries.find((g) => g.groupKey === activeGroup);
    const base = groupView?.groupChanges ?? [];
    if (model.changes.length <= base.length) return base;
    return filterChangesForGroup(model.changes, activeGroup, summary);
  }, [model, activeGroup, groupView]);
  const changeCount = groupChanges.length + model.globalSummary.globalChanges.length;

  if (!enabled) return null;
  if (model.availableGroups.length === 0) return null;

  const selectableGroups = WORLD_CUP_GROUP_LETTERS.filter((letter) =>
    model.availableGroups.includes(letter),
  );

  return (
    <section
      className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 px-4 py-3"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-emerald-100">
            {showGroupContext
              ? `Escenario en vivo — Grupo ${activeGroup}`
              : "Escenario en vivo — Global"}
          </h2>
          <p className="mt-0.5 text-[10px] text-emerald-200/60">
            Tabla y cruces según reglamento FIFA ·{" "}
            {model.isProvisional ? "provisional" : "confirmado"}
          </p>
        </div>
        {changeCount > 0 && (
          <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
            {changeCount} cambio{changeCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {selectableGroups.length > 1 && (
        <div
          className="mt-2 flex flex-wrap gap-1"
          role="tablist"
          aria-label="Grupo del escenario en vivo"
        >
          {selectableGroups.map((letter) => (
            <button
              key={letter}
              type="button"
              role="tab"
              aria-selected={activeGroup === letter}
              onClick={() => onActiveGroupChange(letter)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                activeGroup === letter
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-900/40 text-emerald-200/70 hover:bg-emerald-800/50"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {showGroupContext && groupView?.hasActivity && (
        <>
          {groupChanges.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs leading-relaxed text-amber-100/90">
              {groupChanges.map((change) => (
                <li key={`${change.type}-${change.teamId}-${change.text.slice(0, 24)}`}>
                  {change.text}
                </li>
              ))}
            </ul>
          )}

          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-emerald-50/90">
            {groupView.lines.map((line) => (
              <li key={line.slice(0, 48)} className="flex gap-2">
                <span className="text-emerald-500/80">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {showGroupContext && !groupView?.hasActivity && (
        <p className="mt-3 text-xs text-emerald-200/60">
          Sin actividad en el Grupo {activeGroup} todavía.
        </p>
      )}

      <div className="mt-3 border-t border-emerald-800/50 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/70">
          {model.globalSummary.r32Label}
        </p>
        {model.globalSummary.scenarioKey && (
          <p className="mt-1 text-[10px] text-emerald-200/50">
            Anexo C: {model.globalSummary.scenarioKey}
          </p>
        )}
        {model.globalSummary.qualifyingThirds.length > 0 && (
          <p className="mt-1 text-[10px] leading-relaxed text-emerald-200/50">
            Mejores terceros provisionales:{" "}
            {model.globalSummary.qualifyingThirds
              .slice(0, 8)
              .map((t) => `${t.teamName} (${t.groupKey})`)
              .join(" · ")}
          </p>
        )}
      </div>
    </section>
  );
}
