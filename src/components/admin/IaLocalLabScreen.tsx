import Link from "next/link";
import { IaLocalLabClient } from "@/components/admin/IaLocalLabClient";
import { MatchSummaryLabClient } from "@/components/admin/MatchSummaryLabClient";
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
        Ollama local — explicaciones de señales y resúmenes post-partido (no scoring).
      </p>

      <div className="mt-6 space-y-10">
        <section>
          <h2 className="text-sm font-bold text-emerald-400">Explicación de señales</h2>
          <div className="mt-3">
            <IaLocalLabClient />
          </div>
        </section>

        <section className="border-t border-zinc-800 pt-8">
          <h2 className="text-sm font-bold text-violet-400">Resumen IA de partido</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Post-partido con datos reales y voces ficticias (solo lab, sin guardar en DB).
          </p>
          <div className="mt-3">
            <MatchSummaryLabClient />
          </div>
        </section>
      </div>
    </main>
  );
}
