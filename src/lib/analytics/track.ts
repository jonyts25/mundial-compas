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
 * Tracking central. MVP: console en dev, noop en prod hasta conectar PostHog/etc.
 * No incluir contenido de mensajes, motivos de eliminación ni PII.
 */
export function trackEvent<N extends AnalyticsEventName>(
  name: N,
  properties?: AnalyticsEventMap[N],
): void {
  logDev(name, properties);

  if (!isAnalyticsEnabled()) return;

  // Integración futura: posthog.capture(name, properties)
}

/** Mismo contrato en server actions (sin window). */
export function trackEventServer<N extends AnalyticsEventName>(
  name: N,
  properties?: AnalyticsEventMap[N],
): void {
  logDev(name, properties);
  if (!isAnalyticsEnabled()) return;
}
