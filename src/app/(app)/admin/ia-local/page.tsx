import Link from "next/link";
import { IaLocalLabClient } from "@/components/admin/IaLocalLabClient";
import { requireAiLabUser } from "@/lib/ai/require-ai-lab";

export const dynamic = "force-dynamic";

export default async function IaLocalLabPage() {
  await requireAiLabUser();

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-12">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-white">
        ← Admin
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
