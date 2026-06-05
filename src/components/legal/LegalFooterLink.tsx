import Link from "next/link";

export function LegalFooterLink() {
  return (
    <p className="py-3 text-center text-[10px] text-zinc-600">
      <Link href="/legal" className="text-zinc-500 underline-offset-2 hover:text-emerald-500 hover:underline">
        Aviso legal y disclaimers
      </Link>
    </p>
  );
}
