import type { PersistedMatchStatistics } from "@/lib/api-football/match-statistics";

export function showExpectedGoalsRow(stats: PersistedMatchStatistics): boolean {
  return stats.xg_home != null || stats.xg_away != null;
}

export function formatStatNumber(value: number | null): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
