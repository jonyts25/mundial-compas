import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ codigo: string }>;
}

/** Deep link corto → pantalla de unión con preview. */
export default async function InvitarRedirectPage({ params }: PageProps) {
  const { codigo } = await params;
  const norm = codigo?.trim().toUpperCase();
  if (!norm) redirect("/grupos/unirse");
  redirect(`/grupos/unirse?codigo=${encodeURIComponent(norm)}`);
}
