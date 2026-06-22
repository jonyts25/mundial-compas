import { getAiConfig } from "@/lib/ai/ai-config";
import { collectUserEmails } from "@/lib/ai/resolve-user-email";

export interface AiLabUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ identity_data?: Record<string, unknown> }>;
}

/** true solo para desarrollo con flag o allowlist en prod. */
export function canUseAiLab(user: AiLabUser | null | undefined): boolean {
  if (!user?.id) return false;

  const cfg = getAiConfig();

  if (process.env.NODE_ENV === "development" && cfg.enableOllamaDevApi) {
    return true;
  }

  if (!cfg.labEnabled) return false;

  if (cfg.labAllowedUserIds.includes(user.id)) return true;

  const emails = collectUserEmails(user);
  if (emails.some((email) => cfg.labAllowedEmails.includes(email))) {
    return true;
  }

  return false;
}
