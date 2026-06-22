import type { AiLabUser } from "@/lib/ai/ai-access";

/** Emails conocidos del usuario (JWT, metadata, identities). */
export function collectUserEmails(user: AiLabUser): string[] {
  const emails = new Set<string>();

  const direct = user.email?.trim().toLowerCase();
  if (direct) emails.add(direct);

  const meta = user.user_metadata?.email;
  if (typeof meta === "string" && meta.trim()) {
    emails.add(meta.trim().toLowerCase());
  }

  for (const identity of user.identities ?? []) {
    const fromIdentity = identity.identity_data?.email;
    if (typeof fromIdentity === "string" && fromIdentity.trim()) {
      emails.add(fromIdentity.trim().toLowerCase());
    }
  }

  return [...emails];
}
