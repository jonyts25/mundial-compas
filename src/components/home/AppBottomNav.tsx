"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/posiciones", label: "Grupos", icon: "📊" },
  { href: "/grupos", label: "Quinielas", icon: "👥" },
  { href: "/leaderboard", label: "Liderato", icon: "🏆" },
  { href: "/quiniela", label: "Quiniela", icon: "🎯", primary: true },
] as const;

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex w-[min(100%,24rem)] -translate-x-1/2 items-stretch gap-0.5 rounded-full border border-zinc-700/80 bg-zinc-900/95 p-1 shadow-lg ring-1 ring-zinc-600/40 backdrop-blur-md"
      aria-label="Navegación principal"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        if ("primary" in item && item.primary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2.5 text-xs font-bold transition active:scale-95 sm:text-sm ${
                active
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-900/40 ring-2 ring-emerald-400/40"
                  : "bg-emerald-600 text-white shadow-md shadow-emerald-900/50 ring-2 ring-emerald-400/30 hover:bg-emerald-500"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-2.5 text-[11px] font-semibold transition active:scale-95 sm:px-3 sm:text-xs ${
              active
                ? "bg-zinc-800 text-emerald-300 ring-1 ring-emerald-600/40"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
