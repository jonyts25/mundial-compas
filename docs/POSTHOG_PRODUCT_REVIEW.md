# PostHog Product Review — Mundial Compas

> Guía para revisar adopción de **El Pitoniso**, **pronóstico inline en partido** y **¿Qué hay de nuevo?** en PostHog.
>
> **Alcance:** documentación de lectura. No modifica código ni producción.
>
> **Requisitos:** `NEXT_PUBLIC_ANALYTICS_ENABLED=true` y `NEXT_PUBLIC_POSTHOG_KEY` en Railway (ver `docs/ANALYTICS.md`).

---

## Eventos relevantes

| Evento | Cuándo se dispara | Payload clave |
|--------|-------------------|---------------|
| `match_view` | Vista de `/partidos/[id]` | `partido_id`, `estatus` |
| `pitoniso_shown` | Card El Pitoniso con veredicto listo | `partido_id`, `liga_scope`, `confidence`, `favorite`, `crowd_sample_ok` |
| `pitoniso_expanded` | Usuario abre acordeón “¿Qué es El Pitoniso?” | `partido_id` |
| `pronostico_saved` | Primera vez que guarda pick | `liga_scope`, `partido_id`, `source?` |
| `prediction_updated` | Edita pick existente | `liga_scope`, `partido_id`, `source?` |
| `whats_new_shown` | Modal novedades visible | `version` |
| `whats_new_dismissed` | Usuario cierra modal | `version` |

**Fuentes de `source` en predicciones:**

| Valor | Origen |
|-------|--------|
| `"match_detail"` | `TuPronosticoCard` en `/partidos/[id]` |
| *(ausente)* | `/quiniela` (`PronosticoRow`) — tratar como **quiniela** en análisis |

**Sin PII:** ningún evento incluye email, nombre ni contenido de picks individuales.

---

## Funnel 1 — Adopción Pitoniso

```
match_view
  → pitoniso_shown
    → pitoniso_expanded
```

### Cómo armarlo en PostHog

1. **Insights → Funnels**
2. Pasos en orden estricto (misma sesión o ventana 7 días — elegir según volumen).
3. Filtrar `estatus = programado` en `match_view` si PostHog expone la propiedad.

### Métricas

| Métrica | Fórmula | Interpretación |
|---------|---------|----------------|
| **Show rate** | `pitoniso_shown` / `match_view` (programados) | % de visitas a partido donde El Pitoniso llegó a renderizar veredicto |
| **Expand rate** | `pitoniso_expanded` / `pitoniso_shown` | Curiosidad / confianza en el disclaimer |
| **Usuarios únicos por paso** | Unique users en cada evento | Alcance real vs sesiones repetidas |

### Señales sanas (orientativo)

- Show rate alto en partidos **programados** con contexto estático OK.
- Expand rate bajo-medio (5–20%) es normal; muy bajo puede indicar copy poco claro en el acordeón.

---

## Funnel 2 — Conversión partido

```
match_view
  → pitoniso_shown
  → pronostico_saved  (source = "match_detail")
```

Variante sin Pitoniso intermedio:

```
match_view
  → pronostico_saved  (source = "match_detail")
```

### Métricas

| Métrica | Cómo medir |
|---------|------------|
| **Guardado desde partido** | % usuarios con `pronostico_saved` o `prediction_updated` donde `source = match_detail` |
| **Conversión post-Pitoniso** | Usuarios con `pitoniso_shown` → luego `pronostico_saved` mismo `partido_id` en ventana 30 min |
| **Tiempo aproximado** | PostHog **Time to convert** en funnel, o SQL: delta entre timestamps de `match_view` y `pronostico_saved` |

### Notas

- Incluir `prediction_updated` con `source = match_detail` si el usuario **editó** en lugar de crear.
- Comparar periodo **antes vs después** del deploy PITONISO-UX-1 (`2026-06`).

---

## Funnel 3 — Whats New discovery

```
whats_new_shown
  → whats_new_dismissed
  → match_view
  → pitoniso_shown
```

### Métricas

| Métrica | Fórmula |
|---------|---------|
| **Dismiss rate** | `whats_new_dismissed` / `whats_new_shown` |
| **Descubrimiento Pitoniso post-modal** | Usuarios con funnel completo en ventana 24 h |
| **Versión** | Filtrar por `version = 2026-06-pitoniso-v1` |

### Hipótesis

Si el modal ayuda, usuarios que lo ven deberían tener **mayor show rate** de `pitoniso_shown` en su primera sesión post-dismiss vs cohorte sin modal (localStorage ya visto).

---

## Comparativa quiniela vs partido

### Eventos a segmentar

| Segmento | Filtro PostHog |
|----------|----------------|
| Desde partido (creación) | `pronostico_saved` + `source = match_detail` |
| Desde partido (edición) | `prediction_updated` + `source = match_detail` |
| Desde quiniela | `pronostico_saved` / `prediction_updated` sin `source` o `source = quiniela` |

### Preguntas de análisis

1. **¿Dónde guarda más la gente?** — conteo semanal por segmento.
2. **¿El detalle compite o complementa?** — usuarios que usan **ambos** canales vs solo uno (cohort overlap).
3. **¿El partido roba picks de quiniela?** — si `match_detail` sube y quiniela total se mantiene → complemento; si quiniela baja → sustitución parcial.

### Query sugerida (PostHog Trends)

- **Breakdown:** `source` en `pronostico_saved`
- **Intervalo:** semanal
- **Chart:** stacked bar

---

## Dashboard recomendado

Crear un dashboard **“Mundial Compas — Product Review”** con estos widgets:

| # | Widget | Tipo | Config |
|---|--------|------|--------|
| 1 | Funnel Pitoniso | Funnel | `match_view` → `pitoniso_shown` → `pitoniso_expanded` |
| 2 | Funnel conversión partido | Funnel | `match_view` → `pronostico_saved` filtro `source=match_detail` |
| 3 | Trend Pitoniso | Trends | `pitoniso_shown` semanal, unique users |
| 4 | Trend picks por source | Trends | `pronostico_saved` breakdown `source`, semanal |
| 5 | Whats New | Trends | `whats_new_shown` vs `whats_new_dismissed`, semanal |
| 6 | Top partidos | Table | `pitoniso_shown` breakdown `partido_id`, top 20 |
| 7 | Retención pronosticador | Retention | Evento A: `pronostico_saved` cualquier source; Evento B: mismo en día +7 |

### Filtros globales útiles

- Rango de fechas (últimos 7 / 30 días)
- `liga_scope = global` en eventos que lo tengan
- Excluir entorno dev (si se usa project separado, no hace falta)

---

## Preguntas de producto

1. **¿La gente descubre Pitoniso?** → Funnel 1 show rate; tabla partidos con más `pitoniso_shown`.
2. **¿Entiende suficiente para expandirlo?** → Expand rate; correlación confidence vs expand.
3. **¿Guarda desde partido?** → Funnel 2; % `source=match_detail` vs total picks.
4. **¿Whats New ayuda?** → Funnel 3; cohorte post-dismiss vs control.
5. **¿Qué partidos concentran interés?** → Widget #6; cruzar con kickoff vía lookup manual de UUID.

---

## Checklist de revisión semanal

- [ ] Live Events: confirmar que llegan los 7 eventos listados
- [ ] Funnel 1: show rate estable o mejorando post-deploy
- [ ] Funnel 2: picks `match_detail` > 0 y creciendo
- [ ] Comparativa: quiniela no colapsó (complemento, no cannibalización total)
- [ ] Whats New: dismiss rate > 80% (usuarios leyeron y cerraron)
- [ ] Anomalías: picos de `pitoniso_shown` sin `match_view` (investigar doble mount dev)

---

## Referencias en repo

| Doc / código | Uso |
|--------------|-----|
| `docs/ANALYTICS.md` | Activación PostHog, privacidad |
| `PITONISO_REPORT.md` | Payloads Pitoniso |
| `PITONISO_UX1_REPORT.md` | `source: match_detail` |
| `WHATS_NEW_1_REPORT.md` | Eventos modal, versión changelog |

---

*PostHog Product Review · ANALYTICS-REVIEW-1 · Jun 2026*
