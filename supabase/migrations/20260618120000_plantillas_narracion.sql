-- Plantillas de narración para push/chat (api-sports). Código TS tiene fallback estático.

CREATE TYPE public.narracion_evento AS ENUM (
  'gol',
  'tarjeta_roja',
  'inicio_partido',
  'medio_tiempo',
  'medio_tiempo_sin_goles',
  'segundo_tiempo',
  'fin_partido',
  'gol_anulado',
  'penal_anotado',
  'penal_fallado'
);

CREATE TABLE public.plantillas_narracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento public.narracion_evento NOT NULL,
  estilo TEXT NOT NULL,
  plantilla TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plantillas_narracion_evento ON public.plantillas_narracion (evento, activo, prioridad DESC);

ALTER TABLE public.plantillas_narracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY plantillas_narracion_select ON public.plantillas_narracion
  FOR SELECT TO authenticated, anon USING (activo = TRUE);

-- Seed: frases destacadas (Emilio Fernando Alonso, Yisus, medio tiempo 0-0)
INSERT INTO public.plantillas_narracion (evento, estilo, plantilla, prioridad) VALUES
  ('segundo_tiempo', 'Emilio Fernando Alonso (parodia)', '¡Arrrrrrrancamos la segunda parte! {local} {marcador} {visitante}. ¡Así se juega, compadres!', 10),
  ('segundo_tiempo', 'Emilio Fernando Alonso (parodia)', '¡Arrrrrrranca el segundo tiempo! Marcador {marcador}. ¡A remontar la quiniela, compadres!', 10),
  ('segundo_tiempo', 'Jesús Bracamontes · Yisus (parodia)', '¡Se encienden las pasiones! Segundo tiempo: {local} {marcador} {visitante}. ¡Papá, que siga la fiesta!', 10),
  ('segundo_tiempo', 'Jesús Bracamontes · Yisus (parodia)', '¡Se encienden las pasiones en la cancha! {marcador}. ¡Arranca la segunda mitad!', 10),
  ('inicio_partido', 'Jesús Bracamontes · Yisus (parodia)', '¡Se encienden las pasiones! {local} vs {visitante}. ¡Papá, que empiece la fiesta!', 10),
  ('medio_tiempo_sin_goles', 'Martinoli (parodia)', '¡Medio tiempo! 0-0. Partido cerrado… por ahora. ¡La segunda mitad explota, señoras y señores!', 10),
  ('medio_tiempo_sin_goles', 'Perro Bermúdez (parodia)', 'Al descanso 0-0. Partido de ajedrez, compadres. ¡Falta sangre en la segunda!', 10),
  ('medio_tiempo_sin_goles', 'Dr. García (parodia)', 'Diagnóstico: 0-0 al descanso. Síntoma: aburrimiento leve. Receta: segundo tiempo urgente.', 5),
  ('gol', 'Perro Bermúdez (parodia)', '¡Gooooooooool! ¡Gooooooooool! {goleador} la empuja con alma{extra}. Marcador {marcador}. ¡Así se juega, compadre!', 5),
  ('gol', 'Martinoli (parodia)', '¡GOOOOOOL! {goleador} la manda a guardar{extra}. {marcador}. ¡Señoras y señores, esto es fiesta total!', 5),
  ('tarjeta_roja', 'José Ramón Fernández (parodia)', '¡Expulsión! ¡Expulsión! {goleador} se va{extra}. ¡El Profe lo advirtió!', 5),
  ('tarjeta_roja', 'Perro Bermúdez (parodia)', '¡A bañarse temprano! {goleador} vio la roja{extra}. ¡Le sacaron el cuchillo!', 5);
