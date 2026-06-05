"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import type { QuinielaSelectorOption } from "@/lib/quiniela/selector-options";

interface QuinielaSelectorProps {
  options: QuinielaSelectorOption[];
  /** Liga activa (id global o grupo). */
  activeLigaId: string;
  compact?: boolean;
}

export function QuinielaSelector({
  options,
  activeLigaId,
  compact = false,
}: QuinielaSelectorProps) {
  const pathname = usePathname();

  return (
    <div
      className={
        compact
          ? ""
          : "mb-4 rounded-xl border border-violet-800/40 bg-violet-950/20 p-3"
      }
      role="list"
      aria-label="Selector de quinielas"
    >
      {!compact && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400/90">
            Quiniela activa
          </p>
          <Link
            href="/grupos"
            className="text-[10px] font-semibold text-violet-300 hover:underline"
          >
            Gestionar →
          </Link>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((opt) => {
          const isActive =
            opt.id === activeLigaId ||
            (opt.esGlobal && pathname === "/quiniela") ||
            (!opt.esGlobal && pathname.startsWith(`/grupos/${opt.slug}`));

          return (
            <Link
              key={opt.id}
              href={opt.href}
              role="listitem"
              onClick={() => {
                if (!isActive) {
                  trackEvent("quiniela_selected", {
                    liga_scope: opt.esGlobal ? "global" : "grupo",
                    liga_id: opt.id,
                  });
                }
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                isActive
                  ? opt.esGlobal
                    ? "bg-emerald-600 text-white"
                    : "bg-violet-600 text-white"
                  : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {opt.esGlobal ? "🌍 " : "👥 "}
              {opt.nombre}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
