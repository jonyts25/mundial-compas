"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { trackEvent } from "@/lib/analytics/track";
import {
  WHATS_NEW_ITEMS,
  WHATS_NEW_STORAGE_KEY,
  WHATS_NEW_VERSION,
} from "@/lib/product/whats-new";

const whatsNewListeners = new Set<() => void>();

function subscribeWhatsNew(callback: () => void): () => void {
  whatsNewListeners.add(callback);
  return () => {
    whatsNewListeners.delete(callback);
  };
}

function emitWhatsNewChange(): void {
  whatsNewListeners.forEach((listener) => listener());
}

function readWhatsNewSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(WHATS_NEW_STORAGE_KEY) === WHATS_NEW_VERSION;
  } catch {
    return true;
  }
}

function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, WHATS_NEW_VERSION);
  } catch {
    /* quota / private mode */
  }
  emitWhatsNewChange();
}

export function WhatsNewModal() {
  const seen = useSyncExternalStore(
    subscribeWhatsNew,
    readWhatsNewSeen,
    () => true,
  );
  const open = !seen;
  const shownTracked = useRef(false);

  useEffect(() => {
    if (!open || shownTracked.current) return;
    shownTracked.current = true;
    trackEvent("whats_new_shown", { version: WHATS_NEW_VERSION });
  }, [open]);

  const dismiss = useCallback(() => {
    markWhatsNewSeen();
    trackEvent("whats_new_dismissed", { version: WHATS_NEW_VERSION });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar"
        onClick={dismiss}
      />

      <div className="relative z-10 flex max-h-[min(90vh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950 shadow-2xl shadow-emerald-950/40 ring-1 ring-emerald-500/15">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
              Novedades
            </p>
            <h2 id="whats-new-title" className="text-lg font-bold text-zinc-50">
              ¿Qué hay de nuevo?
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {WHATS_NEW_ITEMS.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-zinc-100">
                <span aria-hidden className="mr-1.5">
                  {item.emoji}
                </span>
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {item.description}
              </p>
            </li>
          ))}
        </ul>

        <div className="border-t border-zinc-800/80 px-4 py-3">
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
          >
            Va, entendido
          </button>
        </div>
      </div>
    </div>
  );
}
