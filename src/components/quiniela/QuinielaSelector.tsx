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

  return (
    <div className="mb-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        Quiniela activa
      </p>
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Seleccionar quiniela"
      >
        {options.map((opt) => {
          const active =
            opt.id === activeLigaId ||
            (opt.esGlobal && pathname === "/quiniela") ||
            (!opt.esGlobal && pathname.startsWith(`/grupos/${opt.slug}`));

          return (
            <Link
              key={opt.id}
              href={opt.href}
              role="listitem"
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                active
                  ? opt.esGlobal
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-violet-600 text-white shadow-md"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
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
