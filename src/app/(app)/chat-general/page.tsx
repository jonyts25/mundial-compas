import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Chat general global pausado (Fase 3). Historial conservado en BD. */
export default function ChatGeneralPage() {
  redirect("/");
}
