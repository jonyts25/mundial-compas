/** Payload genérico de webhook API-Football (ajustar según eventos contratados). */
export interface ApiFootballWebhookPayload {
  event?: string;
  type?: string;
  fixture?: {
    id: number;
    status?: { short?: string; elapsed?: number | null };
    goals?: { home: number | null; away: number | null };
    teams?: {
      home?: { name?: string; id?: number };
      away?: { name?: string; id?: number };
    };
  };
  goal?: {
    team?: { name?: string };
    player?: { name?: string };
    time?: { elapsed?: number };
    /** api-sports events: "Normal Goal", "Own Goal", "Penalty", … */
    detail?: string | null;
  };
  [key: string]: unknown;
}

export type WebhookHandlerResult = {
  ok: boolean;
  skipped?: boolean;
  message?: string;
};
