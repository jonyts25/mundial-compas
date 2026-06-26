"use client";

import { useState } from "react";
import {
  GroupTabs,
  type PosicionesTabId,
} from "@/components/posiciones/GroupTabs";
import { LiveScenarioCard } from "@/components/posiciones/LiveScenarioCard";
import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import type {
  FullKnockoutTree,
  KnockoutBracket,
} from "@/lib/standings/knockout-bracket-types";
import type { StandingGroup } from "@/lib/standings/types";
import type { WorldCupGroupLetter } from "@/lib/standings/world-cup-groups";
import type { LiveScenarioCardModel } from "@/lib/world-cup/fifa-live-scenarios";
import type { Partido } from "@/types/database";

function isGroupLetter(tab: PosicionesTabId): tab is WorldCupGroupLetter {
  return tab !== "mejores_terceros";
}

interface PosicionesContentProps {
  liveScenarioCard: LiveScenarioCardModel;
  groupStageComplete: boolean;
  groups: StandingGroup[];
  partidosPorGrupo: Record<WorldCupGroupLetter, Partido[]>;
  bestThirdPlaces: BestThirdPlaceRow[];
  knockoutBracket: KnockoutBracket;
  fullKnockoutTree: FullKnockoutTree;
  dataSourceLabel: string;
}

export function PosicionesContent({
  liveScenarioCard,
  groupStageComplete,
  groups,
  partidosPorGrupo,
  bestThirdPlaces,
  knockoutBracket,
  fullKnockoutTree,
  dataSourceLabel,
}: PosicionesContentProps) {
  const defaultGroup =
    liveScenarioCard.availableGroups[0] ??
    (groups.find((g) => g.teams.some((t) => t.played > 0))?.groupKey as
      | WorldCupGroupLetter
      | undefined) ??
    "A";

  const [activeTab, setActiveTab] = useState<PosicionesTabId>(defaultGroup);
  const [scenarioGroup, setScenarioGroup] =
    useState<WorldCupGroupLetter>(defaultGroup);

  const handleTabChange = (tab: PosicionesTabId) => {
    setActiveTab(tab);
    if (isGroupLetter(tab)) {
      setScenarioGroup(tab);
    }
  };

  const handleScenarioGroupChange = (group: WorldCupGroupLetter) => {
    setScenarioGroup(group);
    setActiveTab(group);
  };

  return (
    <>
      <LiveScenarioCard
        initial={liveScenarioCard}
        enabled={!groupStageComplete}
        activeGroup={scenarioGroup}
        onActiveGroupChange={handleScenarioGroupChange}
        showGroupContext={isGroupLetter(activeTab)}
      />

      <div className="mb-4 mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-400">
        {groupStageComplete
          ? "Cuadro de eliminatorias FIFA 2026. Toca un partido del cuadro para ver detalle y pronósticos."
          : "Consulta tablas y calendario por grupo. Independiente de quinielas globales o privadas. Criterios de desempate según "}
        {!groupStageComplete && (
          <>
            <a
              href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/groups-how-teams-qualify-tie-breakers"
              className="text-emerald-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              FIFA 2026
            </a>
            .
          </>
        )}
      </div>

      <GroupTabs
        groups={groups}
        partidosPorGrupo={partidosPorGrupo}
        bestThirdPlaces={bestThirdPlaces}
        knockoutBracket={knockoutBracket}
        fullKnockoutTree={fullKnockoutTree}
        dataSourceLabel={dataSourceLabel}
        groupStageComplete={groupStageComplete}
        active={activeTab}
        onActiveChange={handleTabChange}
      />
    </>
  );
}
