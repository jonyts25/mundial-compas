import Image from "next/image";
import { LogoutButton } from "@/components/home/LogoutButton";
import type { Usuario } from "@/types/database";

interface AppHeaderProps {
  usuario: Usuario;
}

function getInitials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function AppHeader({ usuario }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Mundial 2026
          </p>
          <h1 className="truncate text-lg font-bold text-white">Mundial Compas</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="max-w-[7rem] truncate text-xs font-medium text-zinc-200">
              {usuario.nombre_visible}
            </span>
          </div>

          {usuario.avatar_url ? (
            <Image
              src={usuario.avatar_url}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-full border-2 border-emerald-600/60 object-cover"
            />
          ) : (
            <div
              className="flex size-10 items-center justify-center rounded-full border-2 border-emerald-600/60 bg-emerald-950 text-sm font-bold text-emerald-300"
              aria-hidden
            >
              {getInitials(usuario.nombre_visible)}
            </div>
          )}

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
