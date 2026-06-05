/** URL de escudo desde metadata (apifootball pilot / clubes). */
export function getEscudoFromMetadata(
  metadata: unknown,
  side: "local" | "visitante",
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;

  const direct =
    side === "local" ? m.escudo_local : m.escudo_visitante;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const api = m.apifootball;
  if (api && typeof api === "object") {
    const a = api as Record<string, unknown>;
    const badge =
      side === "local" ? a.team_home_badge : a.team_away_badge;
    if (typeof badge === "string" && badge.trim()) return badge.trim();
  }

  const apiFb = m.api_football;
  if (apiFb && typeof apiFb === "object") {
    const a = apiFb as Record<string, unknown>;
    const logo = side === "local" ? a.home_logo : a.away_logo;
    if (typeof logo === "string" && logo.trim()) return logo.trim();
  }

  return null;
}
