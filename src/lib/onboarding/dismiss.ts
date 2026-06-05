/** Preferencia local para ocultar onboarding (MVP; futuro: usuarios.metadata). */
export const ONBOARDING_DISMISSED_KEY = "mundial-compas:onboarding-dismissed";

export function isOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1";
}

export function dismissOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
}
