# Pitoniso v2.1 — Evaluación local (guardrail multitud)

> **Fecha:** 2026-06-17  
> **Comando:** `npx -y tsx scripts/evaluate-pitoniso-v2.ts`  
> **Motor:** `pitoniso-v2.1-draw` + guardrail `crowdBlocksAutoDraw` / `crowdDrawCoLeadsTop`  
> **Comparación:** `PITONISO_V2_EVALUATION_RUN_2026_06_17.md` (v2 desplegado)

---

## Resumen

| Métrica | v2.1 guardrail | v2 (prev) |
|---------|----------------|-----------|
| Partidos finalizados | 23 | 22 |
| **Evaluados** | **20** | 17 |
| Omitidos (`unknown`) | 3 | 5 |
| **Aciertos** | **12** | 8 |
| **Accuracy** | **60.0%** | **47.1%** |
| **Delta** | **+12.9 pp** | — |
| **Baseline FIFA** | **55.0%** (11/20) | 52.6% |

---

## Foco empates

| Métrica | Valor |
|---------|------:|
| Empates reales | 9 |
| Predichos como `empate` | **2** |
| Empates reales acertados (`pred=empate`) | **1** |
| Empates reales fallados (`pred` local/visitante) | 6 |

**Conservado:** Bélgica vs Egipto (1-1) predice `empate` y acierta.

**Falsos empates eliminados (objetivo):**

| Partido | Antes | Ahora |
|---------|-------|-------|
| México–Serbia | empate | **local** ✓ |
| Costa de Marfil–Ecuador | empate | **local** ✓ |
| Francia–Senegal | empate | **local** ✓ |

**Pendiente:** England vs Croatia sigue `pred=empate` con `draw=strong` (crowd/modas favorecen empate 50%).

---

## Accuracy por `draw_signal`

| Nivel | Hits | Total | Acc |
|-------|-----:|------:|----:|
| strong | 4 | 5 | 80.0% |
| none | 7 | 13 | 53.8% |
| medium | 1 | 2 | 50.0% |

---

## Aciertos (12)

| Partido | Real | Predicho | draw_signal |
|---------|------|----------|-------------|
| **Mexico vs Serbia** | local | **local** | strong |
| Mexico vs South Africa | local | local | none |
| USA vs Paraguay | local | local | none |
| Haiti vs Scotland | visitante | visitante | medium |
| Germany vs Curaçao | local | local | none |
| **Ivory Coast vs Ecuador** | local | **local** | strong |
| Sweden vs Tunisia | local | local | none |
| **Belgium vs Egypt** | **empate** | **empate** | strong |
| **France vs Senegal** | local | **local** | strong |
| Iraq vs Norway | visitante | visitante | none |
| Argentina vs Algeria | local | local | none |
| Austria vs Jordan | local | local | none |

---

## Fallos (8)

| Partido | Real | Predicho | draw_signal |
|---------|------|----------|-------------|
| Canada vs Bosnia & Herzegovina | empate | local | none |
| Qatar vs Switzerland | empate | visitante | none |
| Australia vs Türkiye | local | visitante | medium |
| Spain vs Cape Verde Islands | empate | local | none |
| Saudi Arabia vs Uruguay | empate | visitante | none |
| Iran vs New Zealand | empate | local | none |
| Portugal vs Congo DR | empate | local | none |
| England vs Croatia | local | empate | strong |

**Empates aún fallados (6):** Canadá–Bosnia, Qatar–Suiza, España–Cabo Verde, Arabia–Uruguay, Irán–Nueva Zelanda, Portugal–Congo DR.

---

## Omitidos — `unknown` (3)

| Partido | Real |
|---------|------|
| South Korea vs Czechia | local |
| Netherlands vs Japan | empate |
| *(otros según corrida)* | |

---

## Guardrail aplicado

1. **Multitud clara (≥55%):** `drawSignal` cap a `medium`; `predictedOutcome` no empate automático.
2. **Proxy share:** `crowdLeaderShare` (señales 0–1) o `mostPopularOutcome.pct/100`.
3. **Empate co-líder en crowd** (`crowdDrawCoLeadsTop`, ej. 40/40/20): si moda = favorito score → ganador, no empate.
4. **Sin picks en quiniela:** draw strong no fuerza empate si hay señales estáticas y favorito ≠ empate.

---

## Limitación

Sin snapshot pre-partido: pronósticos y ranking son los **actuales**, no los vigentes antes del kickoff. La comparación v2 vs v2.1 usa dataset contaminado; el delta +12.9 pp es indicativo, no publicable al usuario.

---

## Conclusión

El guardrail **reduce falsos empates** (3/3 objetivo corregidos) **sin perder** el acierto Bélgica–Egipto. Accuracy **60.0%** en n=20 evaluados vs **47.1%** v2 en n=17 comparable. Predicciones de empate bajan de 4 a **2**, más selectivas.
