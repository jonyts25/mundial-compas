/** Eventos de analytics — sin PII ni contenido de mensajes. */

export type AnalyticsEventMap = {
  user_signed_in: { provider?: string };
  onboarding_cta_clicked: { cta: "pronostico" | "crear_grupo" | "unirse" };
  onboarding_dismissed: Record<string, never>;
  pronostico_saved: { liga_scope: "global" | "grupo"; partido_id: string };
  quiniela_selected: { liga_scope: "global" | "grupo"; liga_id: string };
  filtro_jornada_selected: { jornada: number | null };
  filtro_fase_selected: { fase: string | null };
  grupo_created: { tipo_quiniela: string };
  grupo_joined: { via: "codigo" | "link" };
  invite_copied: { kind: "codigo" | "link" };
  invite_shared: { channel: "native" | "whatsapp" };
  deletion_requested: { liga_scope: "grupo" };
  chat_message_sent: { scope: "partido" | "grupo" };
  chat_message_blocked_by_moderation: {
    scope: "partido" | "grupo";
    reason: "flood" | "blocked" | "repeated" | "too_long" | "empty";
  };
  chat_message_reported: { scope: "partido" | "grupo" };
  leaderboard_viewed: { liga_scope: "global" | "grupo" };
  leaderboard_segment_changed: {
    modo: string;
    jornada?: number | null;
    fase?: string | null;
  };
  push_prompt_shown: Record<string, never>;
  push_enabled: Record<string, never>;
  push_denied: Record<string, never>;
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
