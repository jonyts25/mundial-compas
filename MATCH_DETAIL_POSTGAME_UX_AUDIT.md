# MATCH-DETAIL-POSTGAME-UX-AUDIT-1

**Fecha:** 2026-05-18  
**Alcance:** Auditoría + propuesta. Sin implementación UI. Sin borrar chat.

---

## Resumen ejecutivo

El chat por partido **no está aportando valor social** hoy: casi todo el volumen son mensajes automáticos de goles/fases (`evento_partido`). Solo **4 mensajes humanos** de **2 usuarios** en **3 partidos**. En cambio, el panel de chat ocupa **~380px mínimo** al final de la pantalla y compite con pronósticos, info y (futuro) resumen IA + estadísticas.

**Recomendación:** rediseñar post-partido priorizando narrativa y datos; **colapsar el chat por defecto** y moverlo al final como sección secundaria. **No eliminar** el chat ni moverlo solo a grupo — el feed automático sigue siendo útil como línea de tiempo del partido.

---

## 1. Uso real del chat (Supabase prod, 2026-05-18)

Consultas: `mensajes_chat` con `partido_id IS NOT NULL` y `metadata.scope = partido_global` (o null legacy).

### Totales chat partido global

| Métrica | Valor |
|---------|------:|
| Mensajes totales | 319 |
| Mensajes humanos (`usuario_id` not null) | **4** |
| Mensajes automáticos | **315** |
| Usuarios humanos únicos | **2** |
| Partidos con ≥1 mensaje (cualquier tipo) | 43 |
| Partidos con mensaje humano | **3** |
| Ligas con chat partido | 1 (global) |

### Por `tipo`

| Tipo | Count | Usuarios |
|------|------:|---------:|
| `evento_partido` | 305 | 0 |
| `dato_mamalón` | 10 | 0 |
| `usuario` | 4 | 2 |

### Por `estatus` del partido

| Estatus | Mensajes | Usuarios humanos | Partidos |
|---------|--------:|-----------------:|---------:|
| finalizado | 318 | 2 | 42 |
| en_vivo | 1 | 0 | 1 |

### Top partidos (por volumen total)

| Partido | Msgs | Humanos |
|---------|-----:|--------:|
| Switzerland vs Bosnia | 14 | 0 |
| Uzbekistan vs Colombia | 14 | 0 |
| Germany vs Curaçao | 13 | 1 |
| … (mayoría 8–12 msgs, casi todo automático) | | |

### Chat grupo privado (comparación)

| Métrica | Valor |
|---------|------:|
| Mensajes | 1 |
| Usuarios | 1 |
| Ligas | 1 |

**Lectura:** El chat de partido funciona como **ticker de eventos** insertado por sync/webhook, no como conversación. La hipótesis “compas charlando durante el partido” **no se valida** con datos actuales. PRODUCT_ANALYTICS_REVIEW (jun-2026) ya notaba ~10 mensajes usuario — la cifra actualizada sigue siendo marginal frente a 305 eventos automáticos.

---

## 2. Layout actual (`/partidos/[id]`)

Orden vertical en `page.tsx` (todos los estatus):

```
┌ Sticky nav (← Partidos)
├ 1. PartidoHeader          — marcador, fase, eventos_clave (si en_vivo/FT)
├ 2. Pitoniso + pronóstico  — solo programado/aplazado
├ 3. AI Lab panel           — solo canUseAiLab + programado
├ 4. Silenciar push
├ 5. PartidoInfoPanel       — horario, sede, TV, alineaciones
├ 6. PronosticoReminder     — post-kickoff sin pick
├ 7. PronosticosTodosPanel  — agregados quiniela (lazy load, colapsable)
└ 8. ChatPartido            — ChatRoomPanel min-h ~380px, SIEMPRE expandido
```

### Competencia visual

| Bloque | Altura aprox. | Valor post-FT | Notas |
|--------|---------------|---------------|-------|
| Header marcador | ~180px | Alto | Ya muestra eventos_clave |
| Info + alineaciones | ~200–400px | Medio | Duplica sede/grupo del header |
| Pronósticos todos | variable | Alto | Agregados quiniela — core producto |
| **Chat** | **≥380px fijo** | Bajo (humano) / Medio (auto) | Ocupa viewport completo en móvil |
| Resumen IA | — | **No existe en UI** | Lab only |
| Estadísticas FT | — | **No existe en UI** | Solo `metadata.statistics` |
| Tabla/grupo | — | **No en detalle** | Link a `/posiciones` |

`ChatRoomPanel` (`min-h-[min(380px,45vh)]`) fuerza scroll largo antes de ver pronósticos si el usuario no ha scrolleado — en FT el chat queda **después** de pronósticos pero sigue siendo un bloque grande al final.

---

## 3. Estado por fase del partido

### Programado

- **Fuerte:** Pitoniso, pronóstico editable, reminder.
- **Débil:** Chat cerrado hasta T−15min; panel igualmente renderizado con placeholder.
- **Stats:** no aplican.

### En vivo

- **Fuerte:** Marcador realtime, eventos_clave en header, chat abierto T−15 → T+30 post-FT.
- **Débil:** Sin tabla live inline; escenarios grupo en otra ruta.
- **Stats:** no deben mostrarse en vivo (regla producto).

### Finalizado

- **Fuerte:** Marcador + eventos_clave, pronósticos con resultado.
- **Débil:** Sin resumen narrativo, sin stats visuales, chat readonly con 300+ líneas automáticas.
- **Oportunidad:** `metadata.statistics` ya persistible (MATCH-STATS-FT-1); match-summary builder listo en lab.

---

## 4. Dónde ubicar statistics y match summary

| Bloque | Posición propuesta | Fuente datos | Fase |
|--------|-------------------|--------------|------|
| Resumen IA | Debajo del marcador, antes de stats | `metadata.ai_summary` (futuro) o on-demand cache | finalizado |
| Estadísticas finales | Debajo resumen IA | `metadata.statistics` | finalizado |
| Impacto quiniela | Debajo stats; refactor de `PronosticosTodosPanel` | agregados existentes | finalizado + programado (pre) |
| Tabla / grupo | Card compacta con posiciones before/after | standings helper | finalizado (grupos) |
| Chat | **Último**, colapsado | `mensajes_chat` + realtime | todas |

---

## 5. Opciones de chat — evaluación

| Opción | Veredicto | Razón |
|--------|-----------|-------|
| **Mantener visible (actual)** | ❌ No | 380px para 96% contenido automático; ahoga postgame UX |
| **Colapsarlo** | ✅ **Recomendado** | Default cerrado FT/programado; badge “N eventos”; expand on tap |
| **Moverlo abajo** | ✅ Ya está abajo | Mantener orden; reducir altura colapsado |
| **Esconder si no hay mensajes humanos** | ⚠️ Parcial | Ocultaría feed de goles — mejor “colapsado con preview último evento” |
| **Quitar del partido → solo grupo** | ❌ No | Eventos son por partido; grupo chat casi muerto (1 msg) |

---

## 6. Recomendación

### Decisión principal

**Colapsar chat por defecto** en los tres estatus, con reglas:

| Estatus | Default | Input | Preview colapsado |
|---------|---------|-------|-------------------|
| programado | Colapsado | Deshabilitado | “Abre 15 min antes” |
| en_vivo | **Semi-abierto** o colapsado con badge | Habilitado si ventana | Último gol / evento |
| finalizado | **Colapsado** | Solo lectura | “12 eventos · 0 mensajes compas” |

### No hacer (este sprint)

- Borrar chat o mover solo a grupo
- UI pública de resumen IA sin feature flag / cache
- Polling stats en vivo

### Siguiente implementación sugerida (MATCH-DETAIL-POSTGAME-UX-1)

1. `PartidoPostgameSummary` — resumen IA cacheado (tras lab estable)
2. `PartidoFinalStatistics` — barras posesión, shots, corners desde `metadata.statistics`
3. `PartidoQuinielaImpact` — extract de agregados (sin picks individuales en hero)
4. `PartidoGroupStandingCard` — mini tabla si `fase=grupos`
5. `ChatPartido` — prop `defaultCollapsed`, altura mínima cuando colapsado ~56px

---

## 7. Wireframes propuestos

### Finalizado

```
┌─────────────────────────────────────┐
│ ← Partidos                          │
├─────────────────────────────────────┤
│ [Header] Fase · Grupo · FINALIZADO  │
│         ESCUDOS  0 — 0  ESCUDOS     │
│         eventos clave (chips)       │
├─────────────────────────────────────┤
│ ✨ Resumen IA del partido           │
│ headline + lede + 2 párrafos       │
│ facts · jugador destacado           │
├─────────────────────────────────────┤
│ 📊 Estadísticas finales             │
│ Posesión ████████░░ 79%             │
│ Tiros 19–2 · a puerta 3–1          │
│ Corners 9–2 · faltas 14–24          │
├─────────────────────────────────────┤
│ 🎯 Impacto quiniela                 │
│ Marcador más apostado · % aciertos  │
│ Tu pick: 1-0 (tendencia)            │
├─────────────────────────────────────┤
│ 📋 Grupo L — tabla                  │
│ ENG 1º · GHA 2º (antes/después)     │
├─────────────────────────────────────┤
│ Silenciar notificaciones            │
│ Info (sede, TV) — colapsable        │
├─────────────────────────────────────┤
│ ▶ Chat del partido (14 eventos)     │  ← colapsado
└─────────────────────────────────────┘
```

### Programado

```
┌─────────────────────────────────────┐
│ ← Partidos                          │
├─────────────────────────────────────┤
│ [Header] vs · PROGRAMADO            │
├─────────────────────────────────────┤
│ 🐍 Pitoniso + señales               │
│ Pronóstico (goles local/visitante)  │
├─────────────────────────────────────┤
│ 🎯 Quiniela — picks agregados       │
│ (opcional preview multitud)         │
├─────────────────────────────────────┤
│ Info + alineaciones (si disponible) │
├─────────────────────────────────────┤
│ ▶ Chat (abre en 2h 15m)             │  ← colapsado
└─────────────────────────────────────┘
```

### En vivo

```
┌─────────────────────────────────────┐
│ ← Partidos                          │
├─────────────────────────────────────┤
│ [Header] EN VIVO · 67'              │
│ Marcador + eventos_clave            │
├─────────────────────────────────────┤
│ 📋 Tabla live / escenario grupo     │  ← link o embed compacto
├─────────────────────────────────────┤
│ 🎯 Tu pronóstico (readonly)         │
├─────────────────────────────────────┤
│ ▼ Chat del partido (3 eventos nuevos)│  ← opcional expandido en vivo
│ [mensajes + input]                  │
├─────────────────────────────────────┤
│ Info colapsada                      │
└─────────────────────────────────────┘
```

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Usuarios power del chat humano (2) | Colapsado ≠ eliminado; expandir sigue disponible |
| Confundir feed automático con chat social | Renombrar a “Eventos y chat” en FT |
| Resumen IA alucina | `facts[]` + confidence + data_gaps (ya en lab) |
| Stats solo en partidos FT post-deploy | Backfill script + sync-live |
| Muestra pequeña (24 usuarios) | Re-auditar con `analytics:snapshot` en jornada 1 WC |

---

## 9. Métricas de éxito (post-rediseño)

- `match_view` → scroll depth / tiempo en postgame blocks (PostHog)
- % partidos FT con resumen IA generado
- Expansión manual del chat (`chat_expanded` evento nuevo)
- Mensajes `usuario` por partido en vivo (objetivo: crecer, no empeorar)

---

## Referencias código

- Pantalla: `src/app/(app)/partidos/[id]/page.tsx`
- Chat: `src/components/partidos/ChatPartido.tsx`, `ChatRoomPanel.tsx` (min-h 380px)
- Quiniela: `src/components/quiniela/PronosticosTodosPanel.tsx`
- Stats persistidas: `src/lib/api-football/match-statistics.ts`
- Resumen IA builder: `src/lib/ai/match-summary/build-match-summary-input.ts`
