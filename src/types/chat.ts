import type { TipoMensajeChat } from "@/types/database";

export interface ChatAutor {
  id: string;
  nombre_visible: string;
  avatar_url: string | null;
}

export interface MensajeChat {
  id: string;
  partido_id: string;
  liga_id: string;
  usuario_id: string | null;
  tipo: TipoMensajeChat;
  contenido: string;
  created_at: string;
  reportado: boolean;
  conteo_reportes: number;
  oculto: boolean;
}

export interface MensajeChatConAutor extends MensajeChat {
  autor: ChatAutor | null;
}

/** Fila devuelta por Realtime / RPC de moderación */
export type MensajeChatRealtimeRow = Pick<
  MensajeChat,
  | "id"
  | "partido_id"
  | "liga_id"
  | "usuario_id"
  | "tipo"
  | "contenido"
  | "created_at"
  | "reportado"
  | "conteo_reportes"
  | "oculto"
>;
