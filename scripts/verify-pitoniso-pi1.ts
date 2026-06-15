/**
 * Verificación manual PI-1 — El Pitoniso.
 * Ejecutar: npx -y tsx scripts/verify-pitoniso-pi1.ts
 */
import {
  generateExampleMessages,
  verifyPitonisoFixtures,
  runPitonisoFixture,
  FIXTURE_MEXICO_POLONIA,
} from "../src/lib/prediction-engine/pitoniso-pi1.fixtures";

const errors = verifyPitonisoFixtures();

if (errors.length > 0) {
  console.error("FIXTURE FAILURES:");
  for (const e of errors) console.error(" ", e);
  process.exit(1);
}

console.log("All fixture assertions passed.\n");

const sample = runPitonisoFixture(FIXTURE_MEXICO_POLONIA);
console.log("Sample verdict (mexico-polonia):");
console.log(JSON.stringify(sample.verdict, null, 2));
console.log("\nSample message:");
console.log(sample.message.message);
console.log("\n--- 10 example messages ---\n");

for (const ex of generateExampleMessages()) {
  console.log(`[${ex.id}]`);
  console.log(ex.message);
  console.log("");
}
