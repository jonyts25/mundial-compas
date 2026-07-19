"use client";

import { useSyncExternalStore, useState } from "react";
import {
  WORLD_CUP_CHAMPION_BANNER_KEY,
  WORLD_CUP_CHAMPION_BANNER_VERSION,
} from "@/lib/product/whats-new";
import { getFlagImageUrl } from "@/lib/teams/flags";

const bannerListeners = new Set<() => void>();

function subscribeBanner(callback: () => void): () => void {
  bannerListeners.add(callback);
  return () => bannerListeners.delete(callback);
}

function emitBannerChange(): void {
  bannerListeners.forEach((listener) => listener());
}

function readBannerDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return (
      localStorage.getItem(WORLD_CUP_CHAMPION_BANNER_KEY) ===
      WORLD_CUP_CHAMPION_BANNER_VERSION
    );
  } catch {
    return true;
  }
}

function dismissBanner(): void {
  try {
    localStorage.setItem(
      WORLD_CUP_CHAMPION_BANNER_KEY,
      WORLD_CUP_CHAMPION_BANNER_VERSION,
    );
  } catch {
    /* ignore */
  }
  emitBannerChange();
}

/** Banner superior — España campeona del Mundial 2026. */
export function WorldCupChampionBanner() {
  const dismissed = useSyncExternalStore(
    subscribeBanner,
    readBannerDismissed,
    () => true,
  );
  const [closing, setClosing] = useState(false);

  if (dismissed) return null;

  function handleDismiss() {
    setClosing(true);
    dismissBanner();
  }

  const flagUrl = getFlagImageUrl("ESP", "w80", "España");

  return (
    <div
      className={`sticky top-0 z-40 border-b border-red-900/50 bg-gradient-to-r from-red-950 via-red-900 to-amber-950 px-4 py-3 shadow-lg transition ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      role="banner"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flagUrl}
          alt=""
          width={48}
          height={36}
          className="h-10 w-14 shrink-0 rounded-md object-cover shadow-md ring-2 ring-amber-400/40"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-amber-100">
            ¡Felicidades, campeón!
          </p>
          <p className="mt-0.5 text-xs leading-snug text-red-100/90">
            España 1-0 Argentina · Campeona del Mundo 2026
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold text-red-200/70 hover:bg-red-950/60 hover:text-red-50"
          aria-label="Cerrar banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
