import Link from "next/link";
import { IaLocalLabClient } from "@/components/admin/IaLocalLabClient";
import { isAppAdmin } from "@/lib/admin/app-admin";
import { requireAiLabUser } from "@/lib/ai/require-ai-lab";

export async function IaLocalLabScreen() {
  const user = await requireAiLabUser();
  const fromAdmin = isAppAdmin(user.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-12">
      <Link
        href={fromAdmin ? "/admin" : "/"}
        className="text-sm text-zinc-500 hover:text-white"
      >
        {fromAdmin ? "← Admin" : "← Inicio"}
      </Link>
      <h1 className="mt-4 text-lg font-bold text-white">IA Local Lab</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Ollama local — explicaciones de señales (no scoring).
      </p>

      <div className="mt-6">
        <IaLocalLabClient />
      </div>
    </main>
  );
}
