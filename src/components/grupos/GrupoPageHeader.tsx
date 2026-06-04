import Link from "next/link";

interface GrupoPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
}

export function GrupoPageHeader({
  title,
  subtitle,
  backHref = "/grupos",
}: GrupoPageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <Link
          href={backHref}
          className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-zinc-500">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
