import { redirect } from "next/navigation";
import { PublicLandingPage } from "@/components/landing/PublicLandingPage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Alias público de la landing (invitados). Autenticados → home app. */
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return <PublicLandingPage />;
}
