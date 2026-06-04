import { rolLigaLabel, type RolLiga } from "@/lib/liga/roles";

interface RolBadgeProps {
  rol: RolLiga;
  className?: string;
}

const STYLES: Record<RolLiga, string> = {
  owner: "bg-amber-950/80 text-amber-300 ring-amber-800/60",
  admin: "bg-violet-950/80 text-violet-300 ring-violet-800/60",
  miembro: "bg-zinc-800 text-zinc-400 ring-zinc-700/60",
};

export function RolBadge({ rol, className = "" }: RolBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${STYLES[rol]} ${className}`}
    >
      {rolLigaLabel(rol)}
    </span>
  );
}
