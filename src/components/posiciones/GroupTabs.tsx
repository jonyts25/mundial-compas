"use client";

import { useMemo, useState } from "react";
import { GroupMatchesList } from "@/components/posiciones/GroupMatchesList";
import { GroupStandingsTable } from "@/components/posiciones/GroupStandingsTable";
import { BestThirdPlacesTable } from "@/components/posiciones/BestThirdPlacesTable";
import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import type { StandingGroup } from "@/lib/standings/types";
import {
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import type { Partido } from "@/types/database";

export type PosicionesTabId = WorldCupGroupLetter | "mejores_terceros";

interface GroupTabsProps {
  groups: StandingGroup[];
  partidosPorGrupo: Record<WorldCupGroupLetter, Partido[]>;
  bestThirdPlaces: BestThirdPlaceRow[];
  dataSourceLabel: string;
}

const TAB_MEJORES: PosicionesTabId = "mejores_terceros";

function isWorldCupGroupTab(id: PosicionesTabId): id is WorldCupGroupLetter {
  return id !== TAB_MEJORES;
}

export function GroupTabs({
  groups,
  partidosPorGrupo,
  bestThirdPlaces,
  dataSourceLabel,
}: GroupTabsProps) {
  const [active, setActive] = useState<PosicionesTabId>("A");

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
    </div>
  );
}
