import { notFound } from "next/navigation";
import { canUseAiLab } from "@/lib/ai/ai-access";
import { createClient } from "@/lib/supabase/server";

/** Devuelve usuario o lanza 404 (no revelar que existe el lab). */
export async function requireAiLabUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canUseAiLab(user)) {
    notFound();
  }

  return user;
}

/** Para API routes: null si no autorizado (responder 404). */
export async function getAiLabUserOrNull() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canUseAiLab(user)) {
    return null;
  }

  return user;
}
