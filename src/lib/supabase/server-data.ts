import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valida userId antes de consultas con service role en el servidor.
 * Solo usar tras verificar sesión con createClient().auth.getUser().
 */
export function assertAuthenticatedUserId(userId: string): void {
  if (!userId || !UUID_RE.test(userId)) {
    throw new Error("userId inválido para consulta de datos en servidor");
  }
}

/** Cliente service role — bypass RLS. Solo en Server Components / Actions. */
export function createServerDataClient() {
  return createAdminClient();
}
