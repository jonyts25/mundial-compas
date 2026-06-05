/** api-sports /fixtures/events → detail: "Own Goal", "Normal Goal", "Penalty", … */
export function isOwnGoalFromDetail(detail: string | null | undefined): boolean {
  if (!detail) return false;
  return detail.toLowerCase().includes("own goal");
}
