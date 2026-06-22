# AI Local Lab — Diseño (AI-LOCAL-LAB-1)

## 1. Dónde insertar IA sin romper Pitoniso

| Capa | Rol | Toca IA |
|------|-----|---------|
| `src/lib/sports-core/` | Señales puras, preview, draw | **No** |
| `src/lib/prediction-engine/` | Pitoniso rule-based, mensajes, pick value | **No** |
| `src/lib/partidos/pitoniso-queries.ts` | Orquestación estática Supabase | **No** |
| `src/components/partidos/PitonisoCard.tsx` | UI pública Pitoniso | **No** (solo botón lab opcional aparte) |
| **`src/lib/ai/`** | Cliente Ollama + prompts + permisos | **Sí (nuevo)** |
| **`/api/dev/ai/*`** | Endpoints lab protegidos | **Sí (nuevo)** |
| **`/admin/ia-local`** | UI laboratorio | **Sí (nuevo)** |

La IA recibe **señales ya calculadas** (strings/JSON) y devuelve **copy explicativo**. No altera scores, pronósticos ni verdictos de Sports Core.

## 2. Endpoints

| Método | Ruta | Función |
|--------|------|---------|
| `GET` | `/api/dev/ai/ollama/health` | Ollama alcanzable + modelos |
| `POST` | `/api/dev/ai/pitoniso-preview` | Explicación JSON desde señales mock o reales |

Ambos exigen `canUseAiLab(user)`; si no → `404`.

## 3. UI dev/admin

- **`/admin/ia-local`**: health, textarea JSON, generar, output, aviso interno.
- **Opcional partido**: panel colapsable “IA Lab” solo si `canUseAiLab`, sin tocar `PitonisoCard`.

## 4. Protección de acceso

`canUseAiLab(user)`:

1. `NODE_ENV=development` + `ENABLE_OLLAMA_DEV_API=true`
2. `AI_LAB_ENABLED=true` + `user.id` en `AI_LAB_ALLOWED_USER_IDS`
3. `AI_LAB_ENABLED=true` + `user.email` en `AI_LAB_ALLOWED_EMAILS`

Usuarios normales: sin rutas, sin botones, sin endpoints.

## 5. Qué NO se toca

- Scoring, triggers, webhooks, RLS, migrations
- Sports Core core logic
- Pitoniso visible para todos
- `savePronostico` y flujos de quiniela

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Alucinaciones / stats inventadas | Prompt: solo señales recibidas; JSON validado |
| Ollama en Railway con `localhost` | Documentar tunnel; health falla elegante |
| Latencia / timeout | `OLLAMA_TIMEOUT_MS` + AbortController |
| Exposición en prod | Feature flag + allowlist; 404 si no autorizado |
| Logs con prompts | No loguear prompts completos en producción |

## 7. Flujo de datos

```
Sports Core / Pitoniso (código) → señales serializadas
        ↓
POST /api/dev/ai/pitoniso-preview (solo lab)
        ↓
ollamaChat (gemma3:4b) → JSON { headline, summary, risk_label, bullets, disclaimer }
        ↓
UI lab (admin o panel partido) — NO reemplaza PitonisoCard
```
