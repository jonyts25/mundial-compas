import { API_SPORTS_BASE_URL } from "@/lib/api-football/constants";

export type ApiSportsParams = Record<string, string | number | undefined | null>;

export interface ApiSportsEnvelope<T> {
  errors: unknown[] | Record<string, string>;
  results: number;
  paging: { current: number; total: number };
  response: T;
}

export class ApiSportsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = "ApiSportsError";
  }
}

export async function apiSportsGet<T>(
  path: string,
  apiKey: string,
  params: ApiSportsParams = {},
): Promise<ApiSportsEnvelope<T>> {
  const url = new URL(`${API_SPORTS_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: ApiSportsEnvelope<T>;
  try {
    body = JSON.parse(text) as ApiSportsEnvelope<T>;
  } catch {
    throw new ApiSportsError(
      `api-sports respondió no-JSON (${res.status}): ${text.slice(0, 200)}`,
      res.status,
    );
  }

  const errObj = body.errors;
  const hasErr =
    (Array.isArray(errObj) && errObj.length > 0) ||
    (errObj &&
      typeof errObj === "object" &&
      !Array.isArray(errObj) &&
      Object.keys(errObj).length > 0);

  if (!res.ok || hasErr) {
    const msg =
      typeof errObj === "object" && !Array.isArray(errObj)
        ? Object.values(errObj).join("; ")
        : JSON.stringify(errObj);
    throw new ApiSportsError(msg || `HTTP ${res.status}`, res.status, errObj);
  }

  return body;
}
