"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { QuinielaSelectorOption } from "@/lib/quiniela/selector-options";

interface QuinielaSelectorProps {
  options: QuinielaSelectorOption[];
  /** Liga activa (id global o grupo). */
  activeLigaId: string;
}

export function QuinielaSelector({ options, activeLigaId }: QuinielaSelectorProps) {
  const pathname = usePathname();
  const active = options.find((o) => o.id === activeLigaId) ?? options[0];

  return (
    <div className="mb-4 rounded-xl border border-violet-800/40 bg-violet-950/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400/90">
            Quiniela activa
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-white">
            {active?.nombre ?? "Mundial Compas"}
          </p>
        </div>
        <Link
          href="/grupos"
          className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-md transition hover:bg-violet-500 active:scale-95"
        >
          Cambiar quiniela
        </Link>
      </div>

      <div
        className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Acceso rápido a quinielas"
      >
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
