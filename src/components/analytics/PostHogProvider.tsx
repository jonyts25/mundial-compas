"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Inicializa PostHog una sola vez en el cliente.
 *
 * Gating:
 *  - Requiere NEXT_PUBLIC_ANALYTICS_ENABLED === "true".
 *  - Requiere NEXT_PUBLIC_POSTHOG_KEY.
 * Si falta cualquiera, NO inicializa: la app funciona exactamente igual y
 * `trackEvent` queda en noop.
 *
 * Privacidad (sin PII):
 *  - autocapture deshabilitado (no captura texto/DOM que pueda contener PII).
 *  - capture_pageview deshabilitado (los page_view se emiten manualmente vía
 *    PageViewTracker para controlar el payload).
 *  - person_profiles: "identified_only" → no se crean perfiles para anónimos.
 *  - No se llama identify() en esta fase (sería solo con UUID, no email/nombre).
 */

let initialized = false;

function analyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized) return;
    if (!analyticsEnabled()) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
      person_profiles: "identified_only",
    });

    initialized = true;
  }, []);

  return <>{children}</>;
}
