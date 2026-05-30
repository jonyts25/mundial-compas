-- Moderación de chat: reportes y mensajes ocultos

ALTER TABLE public.mensajes_chat
  ADD COLUMN IF NOT EXISTS reportado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS conteo_reportes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oculto BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.mensajes_chat
  ADD CONSTRAINT mensajes_conteo_reportes_no_negativo
  CHECK (conteo_reportes >= 0);

-- Reportar mensaje (miembros de la liga; no el autor del mensaje)
CREATE OR REPLACE FUNCTION public.reportar_mensaje_chat(p_mensaje_id UUID)
RETURNS public.mensajes_chat
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.mensajes_chat%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.mensajes_chat WHERE id = p_mensaje_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mensaje no encontrado';
  END IF;

  IF v_msg.oculto THEN
    RAISE EXCEPTION 'Este mensaje ya no está visible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.liga_miembros
    WHERE liga_id = v_msg.liga_id AND usuario_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_msg.usuario_id IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No puedes reportar tu propio mensaje';
  END IF;

  UPDATE public.mensajes_chat
  SET
    conteo_reportes = conteo_reportes + 1,
    reportado = TRUE
  WHERE id = p_mensaje_id
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

REVOKE ALL ON FUNCTION public.reportar_mensaje_chat(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reportar_mensaje_chat(UUID) TO authenticated;

-- Aprobar reporte (admins / owners de la liga)
CREATE OR REPLACE FUNCTION public.aprobar_mensaje_chat(p_mensaje_id UUID)
RETURNS public.mensajes_chat
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.mensajes_chat%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.mensajes_chat WHERE id = p_mensaje_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mensaje no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.liga_miembros
    WHERE liga_id = v_msg.liga_id
      AND usuario_id = auth.uid()
      AND rol IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Solo moderadores pueden aprobar mensajes';
  END IF;

  UPDATE public.mensajes_chat
  SET reportado = FALSE, conteo_reportes = 0
  WHERE id = p_mensaje_id
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

REVOKE ALL ON FUNCTION public.aprobar_mensaje_chat(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aprobar_mensaje_chat(UUID) TO authenticated;

-- Ocultar mensaje (moderación)
CREATE OR REPLACE FUNCTION public.eliminar_mensaje_chat(p_mensaje_id UUID)
RETURNS public.mensajes_chat
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.mensajes_chat%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.mensajes_chat WHERE id = p_mensaje_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mensaje no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.liga_miembros
    WHERE liga_id = v_msg.liga_id
      AND usuario_id = auth.uid()
      AND rol IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Solo moderadores pueden eliminar mensajes';
  END IF;

  UPDATE public.mensajes_chat
  SET
    oculto = TRUE,
    contenido = '[Mensaje eliminado por un moderador]',
    reportado = FALSE,
    conteo_reportes = 0
  WHERE id = p_mensaje_id
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

REVOKE ALL ON FUNCTION public.eliminar_mensaje_chat(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_mensaje_chat(UUID) TO authenticated;
