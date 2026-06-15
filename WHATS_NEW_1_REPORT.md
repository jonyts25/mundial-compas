# WHATS-NEW-1 — Modal “Qué hay de nuevo” — REPORTE

> Anuncio de novedades en home autenticado con persistencia en localStorage.
>
> **Resultado:** ✅ Implementado. Typecheck y lint limpios.

---

## 1. Archivos creados / tocados

| Archivo | Acción |
|---------|--------|
| `src/lib/product/whats-new.ts` | **Nuevo** — versión + ítems del changelog |
| `src/components/product/WhatsNewModal.tsx` | **Nuevo** — modal client |
| `src/app/(app)/page.tsx` | **Editado** — montaje solo en home autenticado |
| `src/lib/analytics/events.ts` | **Editado** — `whats_new_shown`, `whats_new_dismissed` |
| `WHATS_NEW_1_REPORT.md` | **Nuevo** — este reporte |

**No tocados:** BD, auth, scoring, triggers, webhooks, RLS, Sports Core motor, Pitoniso.

---

## 2. Versión y persistencia

| Constante | Valor |
|-----------|--------|
| `WHATS_NEW_VERSION` | `2026-06-pitoniso-v1` |
| `WHATS_NEW_STORAGE_KEY` | `mundial-compas:whats-new-seen` |

Al cerrar el modal se guarda la versión en localStorage. Si `WHATS_NEW_VERSION` cambia en `whats-new.ts`, el modal vuelve a mostrarse.

---

## 3. Dónde se monta

- **`src/app/(app)/page.tsx`** — home autenticado (`/`).
- **No** en `(app)/layout.tsx` global → evita parpadeos en quiniela, partidos, grupos.
- Usuarios no logueados ven `PublicLandingPage` → modal **no** se monta.

---

## 4. Cómo actualizar futuras novedades

1. Editar `WHATS_NEW_ITEMS` en `src/lib/product/whats-new.ts`.
2. Incrementar `WHATS_NEW_VERSION` (ej. `2026-07-ligamx-v1`).
3. Deploy — usuarios con versión antigua en localStorage verán el modal de nuevo.

No requiere migraciones ni backend.

---

## 5. UX

- Cierre: botón **Va, entendido**, **X**, clic en backdrop, **Escape**.
- Fase `pending` → no render (evita hydration mismatch).
- Scroll interno en móvil (`max-h`, `overflow-y-auto`).
- Estilo: zinc + emerald, acorde al resto de la app.

---

## 6. Analytics

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `whats_new_shown` | Primera apertura de la sesión del modal | `{ version }` |
| `whats_new_dismissed` | Cualquier cierre | `{ version }` |

`useRef` evita doble `whats_new_shown`. Sin PII.

---

## 7. QA manual

| # | Caso | Esperado |
|---|------|----------|
| 1 | localStorage vacío | Modal visible al entrar a `/` logueado |
| 2 | “Va, entendido” | Cierra + guarda versión |
| 3 | Recargar | No vuelve a aparecer |
| 4 | Cambiar `WHATS_NEW_VERSION` | Modal reaparece |
| 5 | Móvil | Lista scrolleable, botón accesible |
| 6 | SSR | Sin flash incorrecto (`phase === pending` → null) |

---

## 8. Verificación técnica

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | ✅ |
| ESLint archivos tocados | ✅ |

---

*WHATS-NEW-1 · Jun 2026*
