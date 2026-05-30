"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyPendingHonorTermsIfAny } from "@/lib/auth/apply-honor-terms";

/** Aplica términos guardados en localStorage tras confirmar correo u OAuth. */
export function PendingHonorTermsApplier() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) void applyPendingHonorTermsIfAny(supabase, user.id);
    });
  }, []);

  return null;
}
