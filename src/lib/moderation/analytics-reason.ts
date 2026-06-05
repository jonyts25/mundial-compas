import { CHAT_ERRORS } from "@/lib/moderation/config";

export type ModerationBlockReason =
  | "flood"
  | "blocked"
  | "repeated"
  | "too_long"
  | "empty";

export function moderationErrorToReason(
  error: string,
): ModerationBlockReason {
  if (error === CHAT_ERRORS.blocked) return "blocked";
  if (error === CHAT_ERRORS.repeated) return "repeated";
  if (error === CHAT_ERRORS.tooLong) return "too_long";
  if (error === CHAT_ERRORS.empty) return "empty";
  return "flood";
}
