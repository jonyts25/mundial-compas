# AI Local Lab — Reporte (AI-LOCAL-LAB-1)

## Resumen

Integración piloto de **Ollama local** como provider opcional para **redactar explicaciones** de señales Pitoniso ya calculadas por código. No modifica scoring, Pitoniso público, Sports Core ni `savePronostico`.

## Archivos tocados / creados

| Archivo | Rol |
|---------|-----|
| `AI_LOCAL_LAB_DESIGN.md` | Diseño y auditoría (Fase 1) |
| `AI_LOCAL_LAB_REPORT.md` | Este reporte |
| `.env.example` | Variables AI + Ollama |
| `src/lib/ai/ai-config.ts` | Lectura de env vars |
| `src/lib/ai/ai-access.ts` | `canUseAiLab(user)` |
| `src/lib/ai/require-ai-lab.ts` | Guard servidor para rutas/páginas lab |
| `src/lib/ai/ollama-client.ts` | `ollamaHealth`, `ollamaChat`, `ollamaJson` |
| `src/lib/ai/pitoniso-lab-types.ts` | Tipos input/output |
| `src/lib/ai/pitoniso-preview-prompt.ts` | Prompt + validación respuesta |
| `src/lib/ai/pitoniso-signals-format.ts` | `pitonisoStaticContextToLabInput`, mock |
| `src/app/api/dev/ai/ollama/health/route.ts` | GET health |
| `src/app/api/dev/ai/pitoniso-preview/route.ts` | POST preview |
| `src/app/(app)/admin/ia-local/page.tsx` | Página lab |
| `src/components/admin/IaLocalLabClient.tsx` | UI health + JSON + generar |
| `src/components/partidos/PartidoAiLabPanel.tsx` | Botón opcional en partido |
| `src/app/(app)/partidos/[id]/page.tsx` | Panel lab solo si `canUseAiLab` |
| `src/app/(app)/admin/page.tsx` | Link a lab si autorizado |
| `src/lib/analytics/events.ts` | Evento `ai_lab_preview_generated` (tipado) |
| `scripts/test-ollama-local.mjs` | Smoke test |
| `package.json` | `typecheck`, `test:ollama` |

## Endpoints

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/dev/ai/ollama/health` | `canUseAiLab` → 404 si no |
| POST | `/api/dev/ai/pitoniso-preview` | `canUseAiLab` → 404 si no |

## Env vars

```env
AI_PROVIDER=manual_chatgpt
ENABLE_OLLAMA_DEV_API=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_FAST=llama3.2:3b
OLLAMA_MODEL_SPANISH=gemma3:4b
OLLAMA_MODEL_SMART=qwen3.5:latest
OLLAMA_TIMEOUT_MS=60000
AI_LAB_ENABLED=false
AI_LAB_ALLOWED_USER_IDS=
AI_LAB_ALLOWED_EMAILS=
```

## Cómo activar en local

1. Ollama corriendo con modelos (`gemma3:4b` mínimo para preview en español).
2. En `.env.local`:
   ```env
   ENABLE_OLLAMA_DEV_API=true
   OLLAMA_BASE_URL=http://localhost:11434
   ```
3. `npm run dev`
4. Ir a `/admin/ia-local` (logueado).
5. Smoke: `npm run test:ollama`

## Cómo activar en prod solo para tu usuario

1. En Railway, **no** uses `localhost` como `OLLAMA_BASE_URL` — Railway no alcanza tu PC.
2. Expón Ollama con **Cloudflare Tunnel**, **Tailscale** o **ngrok** y pon la URL pública en `OLLAMA_BASE_URL`.
3. Activa allowlist:
   ```env
   AI_LAB_ENABLED=true
   AI_LAB_ALLOWED_USER_IDS=<tu-uuid-supabase>
   # o
   AI_LAB_ALLOWED_EMAILS=tu@email.com
   ```
4. Accede a `/admin/ia-local` o usa el botón “Probar explicación IA” en partido programado.

## Por qué Railway no puede usar localhost

`localhost` dentro del contenedor Railway apunta al propio contenedor, no a tu máquina. Ollama debe estar en una URL **alcanzable desde la red de Railway** (túnel/VPN) o el health fallará con `OLLAMA_UNAVAILABLE`.

## URLs de prueba

- Admin lab: `http://localhost:3000/admin/ia-local`
- Health API: `GET /api/dev/ai/ollama/health` (con sesión lab)
- Preview API: `POST /api/dev/ai/pitoniso-preview` con body mock de `PITONISO_LAB_MOCK_INPUT`

## Qué NO se tocó

- Scoring, triggers, webhooks, RLS, migrations
- Sports Core core logic
- `PitonisoCard` / flujo Pitoniso público
- `savePronostico`

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| IA inventa estadísticas | Prompt estricto; solo señales en input |
| Exposición pública | `canUseAiLab` + 404 en APIs |
| Ollama caído | Errores controlados, sin stack traces |
| Túnel expuesto | Solo allowlist; no integrar en UI pública |
| Latencia / timeout | `OLLAMA_TIMEOUT_MS`, AbortController |

## Siguiente paso recomendado

1. Probar en local con Ollama activo.
2. Commit + push + `npx railway up --detach`.
3. Configurar túnel estable (Tailscale/CF) si quieres preview desde prod.
4. Si el copy es bueno, considerar enriquecer señales `crowd`/`drawSignal` desde agregados cliente (sin cambiar scoring).
5. Evento PostHog `ai_lab_preview_generated` en cliente cuando se use el panel (opcional).

## QA

| Check | Resultado |
|-------|-----------|
| `npm run lint` | Pre-existentes en repo (16 errors fuera del lab); archivos AI lab sin errores nuevos |
| `npm run typecheck` | OK (tras `npm install` + limpiar `.next`) |
| `npm run build` | OK — rutas `/api/dev/ai/*` y `/admin/ia-local` en manifest |
| `npm run test:ollama` | OK — health 4 modelos; preview JSON con disclaimer (gemma3:4b) |
