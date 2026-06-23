# Product Analytics — Resumen Ollama

Modelo: `llama3.2:3b`  
Fecha snapshot: 2026-06-23

> Solo métricas agregadas del JSON. Sin PII.

**Nota:** El modelo omitió cohortes de retención presentes en el JSON. Abajo, corrección humana con cifras del snapshot; el bloque Ollama original se conserva como referencia.

### Corrección (datos del JSON)

| Observación | Inferencia |
|-------------|------------|
| Cohorte 2026-06: 11 usuarios, 36.4% D+1, 72.7% ≤7d | Retención semanal prometedora en muestra pequeña |
| 754 picks privados vs 420 global | Grupos impulsan más volumen que quiniela global |
| 3 ligas abandonadas de 11 | Fricción post-creación / invitación |
| 10 mensajes chat, 4 partidos | Chat aún no es pilar de engagement |

---

## Texto generado por Ollama (sin editar)

**Análisis del producto "Mundial Compas"**

**1. Qué está funcionando**

* La app tiene una base de usuarios activos, con 17 usuarios que han participado en la última semana (activLast7d).
* El número total de usuarios es de 24.
* La app ha generado un total de 420 picks antes del partido y 0 después.
* El porcentaje de picks generados antes del partido es del 100%.
* La app tiene una cantidad significativa de leagues activas, con 11 leagues en total.

**2. Qué no**

* No se tienen datos sobre la tasa de retención de usuarios que regresan a la app después de un día.
* No se tienen datos sobre la tasa de retención de usuarios que regresan a la app después de una semana.
* La app no tiene una API key para consultas server-side, lo que limita su capacidad para recopilar datos.
* No se tienen datos sobre las interacciones con el chat de la app.

**3. Señales de retención**

* La tasa de retención de usuarios que regresan a la app después de una semana es del 72.7% (cohortWeek: "2026-06").
* El número de usuarios activos en las últimas 24 horas es relativamente bajo, con solo 5 usuarios.
* La cantidad de leagues activas es significativa, lo que puede indicar un interés estable en la app.

**4. Señales de grupo/viralidad**

* La cantidad de chats totales es del 10, lo que no es una cifra elevada.
* La cantidad de chats distintos de partidos es del 4, lo que también no es muy alta.
* No se tienen datos sobre la viralidad de la app en términos de recomendaciones o compartición.

**5. Riesgos**

* La falta de API key para consultas server-side limita la capacidad de recopilar datos y analizar el comportamiento de los usuarios.
* La ausencia de datos sobre la tasa de retención de usuarios que regresan a la app después de un día o una semana puede indicar problemas con la retenión del usuario.

**6. Qué medir esta semana**

* La cantidad de usuarios activos en las últimas 24 horas.
* El número total de picks generados antes y después del partido.
* La tasa de retención de usuarios que regresan a la app después de una semana.
* La cantidad de leagues activas y el número de usuarios participantes en cada liga.