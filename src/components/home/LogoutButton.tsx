"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50"
      aria-label="Cerrar sesión"
    >
      {loading ? "…" : "Salir"}
    </button>
  );
}
