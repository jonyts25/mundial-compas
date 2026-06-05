-- Revisión de solicitudes de eliminación por admin de plataforma (no admin de grupo).

ALTER TABLE public.grupo_eliminacion_solicitudes
  ADD COLUMN IF NOT EXISTS comentario_revision TEXT;

COMMENT ON COLUMN public.grupo_eliminacion_solicitudes.comentario_revision IS
  'Nota del admin de plataforma al aprobar o rechazar.';

-- Sin UPDATE directo desde cliente: solo vía server (service role) tras isAppAdmin en app.
