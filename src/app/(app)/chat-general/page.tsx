import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Chat general global retirado (Fase 3). Redirige a `/`.
 * Mensajes `mensajes_chat` con sala `liga_general` permanecen en BD.
 */
export default function ChatGeneralPage() {
  redirect("/");
}
