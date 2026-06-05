"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyPendingHonorTermsIfAny } from "@/lib/auth/apply-honor-terms";

/**
 * @deprecated Ya no activa quiniela_paga; solo limpia pendiente legacy en localStorage.
 */
export function PendingHonorTermsApplier() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) void applyPendingHonorTermsIfAny(supabase, user.id);
    });
  }, []);

  return null;
}
