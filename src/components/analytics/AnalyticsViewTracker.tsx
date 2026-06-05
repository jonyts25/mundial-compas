"use client";

import { useEffect, useRef } from "react";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";

interface AnalyticsViewTrackerProps<N extends AnalyticsEventName> {
  event: N;
  properties?: AnalyticsEventMap[N];
}

/** Dispara un evento una vez al montar (p. ej. leaderboard_viewed). */
export function AnalyticsViewTracker<N extends AnalyticsEventName>({
  event,
  properties,
}: AnalyticsViewTrackerProps<N>) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, properties);
  }, [event, properties]);

  return null;
}
