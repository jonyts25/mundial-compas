import { APIFOOTBALL_BASE_URL } from "@/lib/apifootball/constants";

export type ApifootballParams = Record<string, string | number | undefined>;

/**
 * Petición GET a apiv3.apifootball.com con auth por query: APIkey=...
 * @see https://apifootball.com/documentation/
 */
export async function apifootballGet<T>(
  action: string,
  apiKey: string,
  params: ApifootballParams = {},
): Promise<T> {
  const key = apiKey.trim().replace(/^["']|["']$/g, "");
  if (!key) {
    throw new Error("API_FOOTBALL_KEY vacía en variables de entorno");
  }

  const url = new URL(APIFOOTBALL_BASE_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("APIkey", key);

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(name, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const rawText = await res.text();
  let json: unknown;

  try {
    json = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error(
      `apifootball.com respuesta no JSON (HTTP ${res.status}): ${rawText.slice(0, 300)}`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `apifootball.com HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`,
    );
  }

  if (
    json &&
    typeof json === "object" &&
    "error" in json &&
    (json as { error?: number }).error !== undefined &&
    (json as { error?: number }).error !== 0
  ) {
    throw new Error(`apifootball.com error: ${JSON.stringify(json)}`);
  }

  return json as T;
}

export function buildApifootballUrl(
  action: string,
  apiKey: string,
  params: ApifootballParams = {},
): string {
  const url = new URL(APIFOOTBALL_BASE_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("APIkey", apiKey.trim());
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(name, String(value));
    }
  }
  return url.toString();
}
