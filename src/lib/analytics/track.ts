import posthog from "posthog-js";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";

function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
}

function logDev(name: AnalyticsEventName, properties?: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", name, properties ?? {});
  }
}

/**
 * Tracking central (cliente). Envía a PostHog solo cuando:
 *  - NEXT_PUBLIC_ANALYTICS_ENABLED === "true", y
 *  - se ejecuta en el navegador (typeof window !== "undefined").
 * Si analytics está apagado, queda como noop y la app funciona igual.
 * No incluir contenido de mensajes, motivos de eliminación ni PII.
 */
export function trackEvent<N extends AnalyticsEventName>(
  name: N,
  properties?: AnalyticsEventMap[N],
): void {
  logDev(name, properties);

  if (!isAnalyticsEnabled()) return;
  if (typeof window === "undefined") return;

  posthog.capture(name, properties as Record<string, unknown> | undefined);
}

/**
 * Mismo contrato en server actions (sin window).
 * La captura server-side de PostHog está diferida (no es objetivo de Sprint 1 Fase A):
 * aquí permanece como noop + log en dev para no introducir PII ni dependencias de red.
 */
export function trackEventServer<N extends AnalyticsEventName>(
  name: N,
  properties?: AnalyticsEventMap[N],
): void {
  logDev(name, properties);
  if (!isAnalyticsEnabled()) return;
}
