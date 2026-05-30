import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * Cliente con service role — solo para Route Handlers / server actions privilegiadas.
 * Bypasea RLS. Nunca exponer en el cliente.
 */
export function createAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
