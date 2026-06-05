import {
  MODO_COMPETENCIA_LABELS,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
import {
  TIPO_QUINIELA_LABELS,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";

export interface InviteSharePayload {
  nombre: string;
  codigo: string;
  tipoQuiniela: TipoQuiniela;
  modoCompetencia: ModoCompetencia;
  miembrosCount: number;
  origin?: string;
}

export function buildInvitePath(codigo: string): string {
  return `/grupos/unirse?codigo=${encodeURIComponent(codigo.trim().toUpperCase())}`;
}

export function buildInviteUrl(codigo: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildInvitePath(codigo)}`;
}

/** Etiqueta amigable para mensajes de compartir (WhatsApp). */
export function modoCompetenciaShareLabel(modo: ModoCompetencia): string {
  return modo === "cooperacion"
    ? "Cooperacha manual"
    : MODO_COMPETENCIA_LABELS.honor;
}

export function buildWhatsAppInviteMessage(
  payload: InviteSharePayload,
): string {
  const link = buildInviteUrl(
    payload.codigo,
    payload.origin ?? (typeof window !== "undefined" ? window.location.origin : ""),
  );
  const tipo = TIPO_QUINIELA_LABELS[payload.tipoQuiniela];
  const modo = modoCompetenciaShareLabel(payload.modoCompetencia);
  const n = payload.miembrosCount;

  return `⚽ Únete a mi quiniela del Mundial en Mundial Compas.

🏆 Grupo: ${payload.nombre}
🎯 Tipo: ${tipo}
🤝 Modo: ${modo}
👥 Ya somos ${n} compa${n === 1 ? "" : "s"}

Entra aquí:
${link}

O usa este código:
${payload.codigo.trim().toUpperCase()}`;
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareInviteNative(
  payload: InviteSharePayload,
): Promise<"shared" | "aborted" | "failed"> {
  if (!canUseNativeShare()) return "failed";

  const origin = payload.origin ?? window.location.origin;
  const url = buildInviteUrl(payload.codigo, origin);
  const text = buildWhatsAppInviteMessage({ ...payload, origin });

  try {
    await navigator.share({
      title: `Quiniela: ${payload.nombre}`,
      text,
      url,
    });
    return "shared";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return "aborted";
    return "failed";
  }
}

/** QR sin dependencias (servicio público ligero). */
export function buildInviteQrUrl(inviteUrl: string, size = 140): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(inviteUrl)}&margin=8`;
}
