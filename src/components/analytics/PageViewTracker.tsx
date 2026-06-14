"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Emite `page_view` en cada cambio de ruta del App Router.
 *
 * Next App Router NO genera page_view automático en navegaciones cliente, por eso
 * se hace manual. Usa solo `usePathname()` (no `useSearchParams`) para:
 *  - evitar incluir query con IDs/tokens sensibles en el payload, y
 *  - no requerir un <Suspense> boundary.
 *
 * Anti-duplicados: ref con el último pathname emitido (cubre StrictMode y
 * re-renders). Si analytics está apagado, `trackEvent` es noop.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackEvent("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
