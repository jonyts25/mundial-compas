"use client";

import { useMemo, useState } from "react";
import { BestThirdPlacesTable } from "@/components/posiciones/BestThirdPlacesTable";
import { GroupMatchesList } from "@/components/posiciones/GroupMatchesList";
import { GroupStandingsTable } from "@/components/posiciones/GroupStandingsTable";
import { KnockoutBracketView } from "@/components/posiciones/KnockoutBracketView";
import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import type { FullKnockoutTree, KnockoutBracket } from "@/lib/standings/knockout-bracket-types";
import type { StandingGroup } from "@/lib/standings/types";
import {
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import type { Partido } from "@/types/database";

export type PosicionesTabId = WorldCupGroupLetter | "mejores_terceros";
export type PosicionesViewMode = "grupos" | "r32";

interface GroupTabsProps {
  groups: StandingGroup[];
  partidosPorGrupo: Record<WorldCupGroupLetter, Partido[]>;
  bestThirdPlaces: BestThirdPlaceRow[];
  knockoutBracket: KnockoutBracket;
  fullKnockoutTree: FullKnockoutTree;
  dataSourceLabel: string;
  active?: PosicionesTabId;
  onActiveChange?: (tab: PosicionesTabId) => void;
}

const TAB_MEJORES: PosicionesTabId = "mejores_terceros";

function isWorldCupGroupTab(id: PosicionesTabId): id is WorldCupGroupLetter {
  return id !== TAB_MEJORES;
}

export function GroupTabs({
  groups,
  partidosPorGrupo,
  bestThirdPlaces,
  knockoutBracket,
  fullKnockoutTree,
  dataSourceLabel,
  active: activeProp,
  onActiveChange,
}: GroupTabsProps) {
  const [viewMode, setViewMode] = useState<PosicionesViewMode>("grupos");
  const [internalActive, setInternalActive] = useState<PosicionesTabId>("A");
  const active = activeProp ?? internalActive;

  const setActive = (tab: PosicionesTabId) => {
    if (onActiveChange) onActiveChange(tab);
    else setInternalActive(tab);
  };

  const groupMap = useMemo(() => {
    const m = new Map<string, StandingGroup>();
    for (const g of groups) m.set(g.groupKey, g);
    return m;
  }, [groups]);

  const activeGroup = isWorldCupGroupTab(active)
    ? groupMap.get(active)
    : undefined;

  return (
    <div className="space-y-4">
      <div
        className="flex rounded-xl border border-zinc-800 bg-zinc-950/80 p-1"
        role="tablist"
        aria-label="Vista de posiciones"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "grupos"}
          onClick={() => setViewMode("grupos")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-bold transition ${
            viewMode === "grupos"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          Grupos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "r32"}
          onClick={() => setViewMode("r32")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-bold transition ${
            viewMode === "r32"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          Ronda de 32
        </button>
      </div>

      {viewMode === "r32" ? (
        <KnockoutBracketView
          bracket={knockoutBracket}
          fullTree={fullKnockoutTree}
        />
      ) : (
        <>
      <div
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Grupos del Mundial"
      >
        {WORLD_CUP_GROUP_LETTERS.map((letter) => (
          <button
            key={letter}
            type="button"
            role="tab"
            aria-selected={active === letter}
            onClick={() => setActive(letter)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
              active === letter
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {letter}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={active === TAB_MEJORES}
          onClick={() => setActive(TAB_MEJORES)}
          className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
            active === TAB_MEJORES
              ? "bg-amber-600 text-white shadow-md"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          Mejores 3.º
        </button>
      </div>

      <p className="text-[10px] text-zinc-600">{dataSourceLabel}</p>

      {active === TAB_MEJORES ? (
        <BestThirdPlacesTable rows={bestThirdPlaces} />
      ) : isWorldCupGroupTab(active) ? (
        <>
          {activeGroup ? (
            <GroupStandingsTable group={activeGroup} />
          ) : (
            <p className="text-sm text-zinc-500">
              Sin datos de tabla para el Grupo {active}.
            </p>
          )}

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Partidos · Grupo {active}
            </h3>
            <GroupMatchesList
              partidos={partidosPorGrupo[active] ?? []}
              groupLabel={`Grupo ${active}`}
            />
          </div>
        </>
      ) : null}
        </>
      )}
    </div>
  );
}
