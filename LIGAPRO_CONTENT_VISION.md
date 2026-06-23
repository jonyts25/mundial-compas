# LigaPro — Content Vision Note

**Estado:** Visión de producto documentada. **No implementar** hasta validar manualmente con una liga real.

---

## Producto

App para **canchas y ligas amateur** donde:

- **Admins** capturan resultados, goles, tarjetas y asistencias en minutos desde el celular.
- **Jugadores** ven sus stats, rachas y posición en tabla.
- **Equipos** comparten links de jornada, tabla y crónica por WhatsApp/Facebook.
- **Papás y familiares** siguen sin instalar nada complejo: tabla, goleadores, tarjetas, partido destacado.
- **IA** redacta crónicas y resúmenes con identidad deportiva — **sin inventar datos**.

Mundial Compas demuestra quiniela + grupos + narrativa (Pitoniso). LigaPro es el mismo ADN aplicado al **fútbol amateur capturado**, no al fixture FIFA.

---

## Datos clave (modelo conceptual)

| Entidad | Campos / relaciones |
|---------|---------------------|
| **Torneo** | nombre, temporada, formato (ida/vuelta, playoffs), reglas de puntos |
| **Equipo** | nombre, escudo, colonia/cancha, link invitación |
| **Jugador** | nombre, dorsal, posición, equipo(s) |
| **Calendario** | jornada, fecha, sede, árbitro opcional |
| **Partido** | local/visitante, marcador, estatus, MVP |
| **Eventos** | gol (minuto, asistencia), tarjeta, cambio, penalti fallado |
| **Sanciones** | fechas de suspensión, acumulación |
| **Tabla** | PJ, PG, PE, PP, GF, GC, DG, PTS |
| **Goleadores** | goles, penales, autogoles excluidos |
| **Porteros / defensas** | valla invicta, goles encajados (si se captura) |
| **Rachas** | invicto, goleada, sin anotar |
| **Destacados** | jugador a seguir, equipo revelación, partido de la jornada |

**Regla de oro:** si no está en eventos capturados, **no aparece en el texto**.

---

## Contenido IA (cronista deportivo)

### Piezas generables

| Pieza | Input mínimo | Tono |
|-------|--------------|------|
| Resumen de jornada | resultados + goleadores + sorpresas | cronista local |
| Previa de jornada | tabla + rachas + enfrentamientos | expectativa moderada |
| Crónica de partido | goles minuto a minuto + tarjetas | narrativa viva |
| Jugador a seguir | últimos N partidos del jugador | “Fulano viene de…” |
| Equipo de la semana | stats agregadas jornada | reconocimiento |
| Post Facebook | highlights + foto opcional | breve, emojis moderados |
| Copy WhatsApp | 3 líneas + link | informal, directo |

### Identidades narrativas (configurables)

- **Cronista clásico** — formal, “la pelota rodó…”
- **Relator de barrio** — cercano, humor ligero
- **Analista táctico** — foco en rachas y tabla (sin inventar sistemas)
- **Papá orgulloso** — celebración del jugador amateur

### Principios IA

1. **IA redacta, no inventa** — solo eventos en BD.
2. **Citar números reales** — minuto, marcador, goleador.
3. **Silencio explícito** — “No hubo tarjetas” solo si el partido está cerrado y el array está vacío.
4. **Valor diferencial:** el jugador se siente visto: *“Martínez lleva 3 goles en 2 jornadas; hoy enfrenta al líder del grupo.”*

---

## Validación manual (antes de app completa)

### Semana 0 — una liga piloto (8–12 equipos)

1. Elegir **una liga real** (amigos, escuela, empresa).
2. Capturar resultados en **Google Sheet o Notion** con el mismo esquema de eventos.
3. Cada jornada, generar crónica con prompt + datos (Ollama o manual) y publicar en WhatsApp del grupo.
4. Medir: ¿la gente la lee? ¿comparten? ¿preguntan por stats?

### Criterios de éxito

- ≥50% de equipos abren el link de resumen.
- ≥2 mensajes espontáneos del tipo “¿cómo va la tabla?”
- Admin captura jornada en <15 min sin frustración.

### Criterios de fracaso (pausar build)

- Nadie comparte después de 3 jornadas.
- Admin abandona por fricción de captura.
- Crónicas reciben “esto está mal” por datos incorrectos (problema de captura, no de IA).

---

## Demo mínima que vendería

**“Liga en un link”** — sin app nativa al inicio:

1. Admin: formulario móvil → resultado + goleadores (1 pantalla).
2. Público: página web con **tabla + goleadores + crónica de la última jornada**.
3. Botón **Compartir en WhatsApp** con copy generado.

Duración demo: **una jornada real publicada en <24h** desde el pitido final.

---

## Datos obligatorios para buenas crónicas

| Obligatorio | Por qué |
|-------------|---------|
| Marcador final | Ancla de toda narrativa |
| Goleadores con minuto | Permite “abrió el marcador al…” |
| Equipos local/visitante | Contexto y tabla |
| Jornada / fecha | Ritmo de torneo |
| Tabla actualizada | Stakes (“líder cayó”) |

| Muy deseable | Por qué |
|--------------|---------|
| Asistencias | “Servido por…” |
| Tarjetas rojas/amarillas | Tensión narrativa |
| MVP del partido | Cierre emocional |
| Historial reciente (H2H o racha) | Previa y jugador a seguir |

| Opcional (fase 2) | Por qué |
|-------------------|---------|
| Alineaciones | Previa táctica (solo si confiables) |
| Fotos | Posts sociales |

---

## Relación con Mundial Compas

| Mundial Compas (hoy) | LigaPro (futuro) |
|----------------------|------------------|
| Fixture FIFA externo | Fixture capturado por admin |
| Pronósticos | Resultados reales |
| Pitoniso (pre-partido) | Cronista (post-jornada) |
| Grupos / quiniela | Equipos / torneos |
| Supabase + Next.js | Misma stack probable |

**No compartir scoring ni migrations** hasta producto separado definido.

---

## Próximo paso cuando el usuario lo pida

1. Piloto manual 3 jornadas (sheet + crónicas).
2. Si valida → schema mínimo torneo/equipo/partido/evento.
3. Demo web “tabla + crónica” antes de stats avanzadas o app nativa.

**Hasta entonces: no código LigaPro en este repo.**
