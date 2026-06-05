# Errores actuales — Mundial Compas

Última verificación: build y lint en repo local (`master` @ `af7dca1`).

## Build (`npm run build`)

| Estado | Detalle |
|--------|---------|
| **OK** | Compila y TypeScript sin errores |
| **Warning** | Next.js 16: convención `middleware` deprecada → migrar a `proxy` |

## Lint (`npm run lint`)

**19 errores, 13 warnings** — el CI no falla build, pero lint sí reporta issues.

### Errores ESLint (prioridad)

| Archivo | Regla | Resumen |
|---------|-------|---------|
| `scripts/sync-lineups-cron.mjs` | parsing | Error de sintaxis en el script |
| `src/app/(auth)/callback/route.ts` | prefer-const | `response` debería ser `const` |
| `src/components/quiniela/TablonLiquidacion.tsx` | rules-of-hooks | `useState` después de `return` condicional — **bug real** |
| Varios componentes | react-hooks/set-state-in-effect | `setState` síncrono en `useEffect` (login, chat, marcador live, push prompt, pronósticos, alineaciones) |
| `QuinielaList.tsx`, `PartidoAlineaciones.tsx` | react-hooks/purity | `Date.now()` durante render |
| `src/lib/apifootball/webhook/process.ts` | prefer-const | `golesAnunciados` debería ser `const` |

### Warnings (no bloquean)

- Variables no usadas en scripts y `process.ts`
- `react-hooks/exhaustive-deps` en `CalendarioPartidos`, `MarcadorLive`
- `fs` no usado en `apifootball-livescore-relay.mjs`

## Runtime / producción

| Área | Estado conocido |
|------|-----------------|
| Webhook livescore | Requiere `livescore-relay` + secret sincronizado en Railway |
| Auth reset password | Depende de `NEXT_PUBLIC_APP_URL` + Redirect URLs en Supabase |
| Push iOS | Requiere PWA instalada en home screen + permisos |
| Migración `20260531120000` | Debe estar aplicada en Supabase para tipos `gol_anulado` y `fin_tiempo_reglamentario` |

## Archivos sin commitear (fuera del último push)

- `package-lock.json` (cambios menores peer deps)
- `scripts/check-db-migrations.mjs` (untracked)

## Cómo reproducir

```bash
npm run build
npm run lint
```
