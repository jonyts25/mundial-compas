"use server";

/**
 * @deprecated Unirse a quiniela de paga global retirado. Global = honor gratuita.
 */
import { GLOBAL_ECONOMIC_UI_DISABLED } from "@/lib/legacy/global-economic-deprecated";

export type AcceptHonorTermsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function acceptHonorTerms(): Promise<AcceptHonorTermsResult> {
  return { ok: false, error: GLOBAL_ECONOMIC_UI_DISABLED };
}
