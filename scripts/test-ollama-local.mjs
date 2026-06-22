/**
 * Smoke test Ollama + pitoniso-preview (AI Local Lab).
 * Requiere app en marcha y ENABLE_OLLAMA_DEV_API=true (o sesión no aplica — usa fetch directo a Ollama + validación local).
 *
 * Uso:
 *   npm run test:ollama
 *   APP_URL=http://localhost:3000 npm run test:ollama -- --api
 */
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const args = new Set(process.argv.slice(2));
const useApi = args.has("--api");
const baseUrl = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:11434";
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? "60000");

const MOCK = {
  match: {
    home: "México",
    away: "Corea del Sur",
    kickoff: "2026-06-15T20:00:00-06:00",
  },
  signals: {
    crowd: "favorece a México (42% local, 28% empate, 30% visitante)",
    form: "favorece a México",
    table: "favorece a México (2° vs 4°)",
    ranking: "ligera ventaja visitante en ranking FIFA",
    drawSignal: "señal media de empate",
    contradictions: ["crowd_vs_ranking"],
  },
};

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function pass(msg) {
  console.log(`✓ ${msg}`);
}

async function testHealth() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    if (!res.ok) fail(`health: HTTP ${res.status}`);
    const body = await res.json();
    const models = (body.models ?? []).map((m) => m.name);
    pass(`health: ${models.length} modelo(s) — ${models.slice(0, 3).join(", ")}`);
    return models;
  } catch (e) {
    if (useApi) {
      console.warn("⚠ Ollama directo no alcanzable; probando API app…");
      return [];
    }
    fail(`Ollama no alcanzable en ${baseUrl} (${e instanceof Error ? e.message : e})`);
  } finally {
    clearTimeout(t);
  }
}

function pickModel(models) {
  const preferred = process.env.OLLAMA_MODEL_SPANISH ?? "gemma3:4b";
  if (models.some((m) => m === preferred || m.startsWith(preferred.split(":")[0]))) {
    return preferred;
  }
  const qwen = models.find((m) => m.includes("qwen"));
  if (qwen) return qwen;
  const llama = models.find((m) => m.includes("llama"));
  if (llama) return llama;
  return models[0] ?? preferred;
}

async function testPreviewDirect(models) {
  const model = pickModel(models);
  const prompt = `Responde SOLO JSON válido:
{
  "headline": "string",
  "summary": "string",
  "risk_label": "bajo|medio|alto",
  "bullets": ["string"],
  "disclaimer": "string"
}
Señales: ${JSON.stringify(MOCK.signals)}
No inventes stats. Disclaimer obligatorio.`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Solo JSON válido." },
          { role: "user", content: prompt },
        ],
        stream: false,
        format: "json",
      }),
    });
    if (!res.ok) fail(`chat: HTTP ${res.status}`);
    const body = await res.json();
    const content = body.message?.content;
    if (!content) fail("chat: respuesta vacía");

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      fail(`JSON inválido: ${content.slice(0, 200)}`);
    }

    for (const key of ["headline", "summary", "risk_label", "bullets", "disclaimer"]) {
      if (!(key in parsed)) fail(`falta campo ${key}`);
    }
    if (!Array.isArray(parsed.bullets)) {
      fail("bullets debe ser array");
    }
    if (parsed.bullets.length > 2) {
      console.warn(`⚠ modelo devolvió ${parsed.bullets.length} bullets (máx recomendado: 2)`);
    }
    if (!parsed.disclaimer || String(parsed.disclaimer).length < 5) {
      fail("disclaimer ausente o muy corto");
    }
    const dangerous = ["100%", "apuesta segura", "gana seguro"];
    const blob = JSON.stringify(parsed).toLowerCase();
    for (const d of dangerous) {
      if (blob.includes(d)) fail(`campo peligroso detectado: ${d}`);
    }

    pass(`preview JSON válido (modelo ${model})`);
    console.log(JSON.stringify(parsed, null, 2));
  } finally {
    clearTimeout(t);
  }
}

async function testPreviewApi() {
  console.log(`API: ${appUrl}/api/dev/ai/pitoniso-preview (requiere sesión lab — skip si 404)`);
  const res = await fetch(`${appUrl}/api/dev/ai/pitoniso-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(MOCK),
  });
  if (res.status === 404) {
    console.warn("⚠ API dev 404 (sin sesión lab) — omitido");
    return;
  }
  const data = await res.json();
  if (!res.ok) fail(`API preview: ${JSON.stringify(data)}`);
  pass("API pitoniso-preview respondió ok");
}

async function main() {
  console.log("=== test-ollama-local ===\n");
  const models = await testHealth();
  if (models.length > 0) {
    await testPreviewDirect(models);
  }
  if (useApi) {
    await testPreviewApi();
  }
  console.log("\nListo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
