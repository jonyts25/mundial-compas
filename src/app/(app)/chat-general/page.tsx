import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { ChatGeneral } from "@/components/chat-general/ChatGeneral";
import {
  fetchChatGeneralHistorial,
  maybeInjectVarTrivia,
} from "@/lib/chat-general/queries";
import { resolveIsModerator } from "@/lib/auth/moderator";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChatGeneralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/chat-general");
  }

  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("id, nombre_visible, avatar_url, quiniela_paga")
    .eq("id", user.id)
    .single();

  if (userError || !usuario) {
    redirect("/login");
  }

  try {
    await maybeInjectVarTrivia();
  } catch {
    /* trivia opcional si migración aún no aplicada */
  }

  const esModerador = await resolveIsModerator(supabase, user.id);
  const mensajes = await fetchChatGeneralHistorial(esModerador);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white">Chat de la Liga</h1>
            <p className="text-xs text-zinc-500">
              Sala permanente · Mundial Compas
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 pb-28">
        <ChatGeneral
          usuario={usuario as import("@/types/database").Usuario}
          initialMessages={mensajes}
          esModerador={esModerador}
        />
      </main>

      <AppBottomNav />
    </>
  );
}
