# STAGING RUNTIME VERIFY — Migration 0

> **Última verificación:** 2026-06-17 (`STAGING-RUNTIME-AUTH-PASS`)  
> **URL staging:** `https://mundial-compas-service-staging.up.railway.app`  
> **Supabase staging:** `jjzfvzmsfiuwjxdjvnpu`  
> **Sin:** mutaciones prod.

---

## Decisión actual

# **READY_FOR_M0**

Runtime staging verificado: conexión Supabase correcta, variables Railway corregidas y **smoke autenticado confirmado manualmente** por el operador.

---

## Verificación infra (automatizada)

| Check | Resultado |
|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` → `jjzfvzmsfiuwjxdjvnpu` | **PASS** |
| `NEXT_PUBLIC_APP_URL` → staging Railway | **PASS** |
| `VAPID_SUBJECT` sin URL prod | **PASS** |
| Bundles JS: solo host staging Supabase | **PASS** |
| `/callback` origen staging | **PASS** |

---

## Verificación manual (operador — AUTH-PASS)

| Check | Resultado |
|-------|-----------|
| Login staging | **PASS** |
| DevTools Network: solo `jjzfvzmsfiuwjxdjvnpu.supabase.co` | **PASS** |
| Sin requests a `hbcsvpbksuunbhagjqyk.supabase.co` | **PASS** |
| Home autenticado | **PASS** |
| Quiniela | **PASS** |
| Leaderboard | **PASS** |
| Partido | **PASS** |
| Pitoniso | **PASS** |
| Multi-quiniela | **PASS** |
| Grupo / quiniela | **PASS** |

**Nota Auth:** app usa redirect `/callback` (no `/auth/callback`).

---

## Siguiente paso

Ejecutar FASE 4 en staging → `STAGING_MIGRATION_0_RESULTS.md`.
