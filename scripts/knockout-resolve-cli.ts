/**
 * CLI entry for resolve-world-cup-knockout-participants.mjs (run via tsx for @/ paths).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";
import { runResolveKnockoutParticipants } from "@/lib/world-cup/run-resolve-knockout-participants";

async function main() {
  loadEnvLocal();

  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const result = await runResolveKnockoutParticipants(supabase, { dryRun });

  console.log(JSON.stringify(result, null, 2));

  if (result.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
