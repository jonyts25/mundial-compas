"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refresca la home cada 45s durante pruebas en vivo (marcador desde BD). */
export function LiveHomeRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => router.refresh(), 45_000);
    return () => window.clearInterval(id);
  }, [enabled, router]);

  return null;
}
