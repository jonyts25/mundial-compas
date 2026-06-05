import Link from "next/link";
import { DisclaimerBlock } from "@/components/legal/DisclaimerBlock";
import { LegalFooterLink } from "@/components/legal/LegalFooterLink";
import { LEGAL_SECTIONS } from "@/lib/legal/disclaimers";

export const dynamic = "force-dynamic";

export default function LegalPage() {
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
          <div>
            <h1 className="text-lg font-bold text-white">Aviso legal</h1>
            <p className="text-xs text-zinc-500">Mundial Compas</p>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4 pb-8">
        <p className="text-sm text-zinc-400">
          Textos de referencia para el uso de la plataforma. Si tienes dudas
          sobre una quiniela privada, contacta al administrador de ese grupo.
        </p>

        {LEGAL_SECTIONS.map((section) => (
          <DisclaimerBlock
            key={section.id}
            title={section.title}
            body={section.body}
          />
        ))}
      </main>

      <LegalFooterLink />
    </>
  );
}
