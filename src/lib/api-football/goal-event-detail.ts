/** api-sports /fixtures/events → detail: "Own Goal", "Normal Goal", "Penalty", … */
export function isOwnGoalFromDetail(detail: string | null | undefined): boolean {
  if (!detail) return false;
  return detail.toLowerCase().includes("own goal");
}

export function isMissedPenaltyFromDetail(detail: string | null | undefined): boolean {
  if (!detail) return false;
  return detail.toLowerCase().includes("missed penalty");
}

export function isVarGoalCancelledDetail(detail: string | null | undefined): boolean {
  if (!detail) return false;
  const d = detail.toLowerCase();
  return d.includes("goal cancelled") || d.includes("goal disallowed");
}
