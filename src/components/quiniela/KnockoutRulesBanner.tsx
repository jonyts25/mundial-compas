"use client";

import { useSyncExternalStore, useState } from "react";
import {
  KNOCKOUT_RULES_ANNOUNCEMENT,
  KNOCKOUT_RULES_BANNER_KEY,
  KNOCKOUT_RULES_VERSION,
} from "@/lib/product/whats-new";

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
    return localStorage.getItem(KNOCKOUT_RULES_BANNER_KEY) === KNOCKOUT_RULES_VERSION;
  } catch {
    return true;
  }
}

function dismissBanner(): void {
  try {
    localStorage.setItem(KNOCKOUT_RULES_BANNER_KEY, KNOCKOUT_RULES_VERSION);
  } catch {
    /* ignore */
  }
  emitBannerChange();
}

export function KnockoutRulesBanner() {
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

  const { emoji, title, description } = KNOCKOUT_RULES_ANNOUNCEMENT;

  return (
    <div
      className={`mb-4 rounded-xl border border-amber-800/40 bg-amber-950/25 px-3 py-3 transition ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      role="status"
    >
      <div className="flex items-start gap-2">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-200">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          aria-label="Cerrar aviso"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
