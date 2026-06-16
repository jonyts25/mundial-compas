#!/usr/bin/env node
/**
 * Reconstruye auditoría de fusiones en producción vía Supabase RPC.
 * Uso: railway run node scripts/rebuild-pronostico-fusion-audit.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.rpc("rebuild_pronostico_fusion_audit_from_footprints");

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));

const { count: pending } = await supabase
  .from("pronostico_fusion_auditoria")
  .select("id", { count: "exact", head: true })
  .in("estado", ["conflicto_pendiente", "notificado"]);

console.log("pending_conflicts:", pending ?? 0);
