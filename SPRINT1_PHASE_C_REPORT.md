# SPRINT 1 — FASE C — USER PROFILES — REPORTE

> Ejecución de **Sprint 1 · Fase C** (perfiles rule-based) según `SPRINT1_PHASE_C_DESIGN.md`.
> Alcance: MVP más pequeño. Sin tablas, migraciones, LLM, pre-lock, LigaPro ni cambios de arquitectura.
>
> **Resultado:** ✅ Completado. Typecheck limpio. Lint limpio en archivos tocados.

---

## 1. Objetivos cumplidos

| # | Objetivo | Estado |
|---|----------|--------|
| 1 | Helper puro `computeUserProfile` | ✅ `src/lib/insights/profiles.ts` |
| 2 | Reutilizar pick-value para picks diferenciales | ✅ `minorityRate` vía `computePickValue` en `profile-data.ts` |
| 3 | Calcular precisión, exactos, tendencia 1X2, empates, diferenciales | ✅ |
| 4 | Devolver perfil principal + 1–2 secundarios + frase positiva | ✅ |
| 5 | Tarjeta "Tu estilo" en leaderboard global | ✅ |
| 6 | Analytics `profile_card_viewed` | ✅ |
| 7 | Typecheck + lint | ✅ |
| 8 | Este reporte | ✅ |

---

## 2. Archivos creados / modificados

### Creados (4)

| Archivo | Rol |
|---------|-----|
| `src/lib/insights/profiles.ts` | Función pura: métricas → `UserProfile` (reglas, umbrales, frases). |
| `src/lib/insights/profile-data.ts` | Lectura on-demand: `pronosticos` + agregados por partido → métricas → perfil. |
| `src/components/leaderboard/UserStyleCard.tsx` | UI "Tu estilo" + evento analytics. |
| `SPRINT1_PHASE_C_REPORT.md` | Este reporte. |

### Modificados (2)

| Archivo | Cambio |
|---------|--------|
| `src/lib/analytics/events.ts` | + `profile_card_viewed`. |
| `src/app/(app)/leaderboard/page.tsx` | Fetch paralelo de perfil + render `UserStyleCard`. |

---

## 3. Métricas calculadas

| Métrica | Fórmula | Fuente |
|---------|---------|--------|
| `N` | Picks puntuados (partido `finalizado` + `puntos_calculados_at`) | `pronosticos` ⋈ `partidos` |
| `P` | Total de picks del usuario | `pronosticos` |
| `exactos` / `tendencias` | `puntos === 3` / `puntos === 1` | `pronosticos.puntos` |
| `exactRate` | `exactos / N` | derivado |
| `hitRate` (tendencia 1X2) | `(exactos + tendencias) / N` | derivado |
| `precision` | `Σpuntos / N / 3` | derivado |
| `drawRate` | picks con empate predicho / `P` | `goles_local === goles_visitante` |
| `minorityRate` | fracción de picks puntuados con `kind` diferencial o raro | `computePickAggregates` + **`computePickValue`** |
| `exactStreak` | exactos consecutivos más recientes (por `fecha_kickoff`) | derivado |

**Muestra mínima:** `N < 5` → perfil **Novato 🌱** (sin estigma).

---

## 4. Perfiles implementados (MVP)

| ID | Emoji | Disparador |
|----|-------|------------|
| `francotirador` | 🎯 | `exactRate ≥ 0.25` |
| `brujula` | 🧭 | `hitRate ≥ 0.6` y `exactRate < 0.15` |
| `diferencial` | 🃏 | `minorityRate ≥ 0.4` |
| `amante_empate` | 🤝 | `drawRate ≥ 0.30` |
| `en_racha` | 🔥 | `exactStreak ≥ 2` |
| `equilibrado` | ⚖️ | fallback si ninguna regla aplica |
| `novato` | 🌱 | `N < 5` |

**Secundarios:** hasta 2 badges de **familia distinta** a la primaria (precisión / estilo / momentum).

**No incluidos en MVP** (diseño completo, fuera de alcance): Escalador, Montaña Rusa, La Roca, Cañonero, Cerrojo (requieren más señales o no prioritarios).

---

## 5. Ejemplo de salida

```jsonc
{
  "primary": { "id": "diferencial", "label": "Apostador Diferencial", "emoji": "🃏" },
  "secondary": [{ "id": "brujula", "emoji": "🧭", "label": "Brújula" }],
  "phrase": "Te atreves con picks poco populares. Cuando pegas, subes fuerte.",
  "metrics": { "N": 12, "exactRate": 0.17, "hitRate": 0.67, "minorityRate": 0.42, "drawRate": 0.08 },
  "sampleOk": true
}
```

---

## 6. UI — dónde verlo

**Ruta:** `/leaderboard` (liga global)

Debajo de **"Tu posición"**, tarjeta **"Tu estilo"**:
- Emoji + nombre del perfil principal
- Frase breve positiva
- Badges secundarios (si aplican)
- Nota: "Basado en N partidos puntuados · estimación recreativa"

**PostHog:** al renderizar la tarjeta → `profile_card_viewed { liga_scope: "global", profile_primary: "diferencial" }`.

---

## 7. Verificación

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | ✅ Exit 0 |
| ESLint (archivos tocados) | ✅ Sin errores ni warnings |

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Estigmatización | Perfiles siempre positivos; fallback Equilibrado/Novato. |
| Muestras pequeñas | `N < 5` → Novato. |
| Costo de `minorityRate` | Solo se calcula para **el usuario actual** en leaderboard (1 usuario), no toda la liga. |
| Perfiles de momentum incompletos | MVP omite rankDelta/RPC por jornada; se añade en iteración futura. |

---

## 9. Qué NO se implementó (por diseño)

- ❌ Badge en filas del leaderboard (P1 del diseño)
- ❌ Perfiles en home o grupos
- ❌ Perfiles momentum con RPC por jornada (Escalador, Montaña Rusa, La Roca)
- ❌ Cañonero / Cerrojo (avgGoals)
- ❌ Tablas, migraciones, LLM, pre-lock, LigaPro

---

## 10. Reutilización con Prediction Engine

- `minorityRate` usa **`computePickValue`** (Sprint 1.5) — sin duplicar lógica de pick diferencial.
- `computePickAggregates` (Fase B) alimenta el cálculo por partido.
- Dependencia unidireccional: `profile-data → pick-value → pick-aggregates`.

---

*Reporte Sprint 1 · Fase C. Rule-based, solo lectura, reversible. Typecheck y lint limpios.*
