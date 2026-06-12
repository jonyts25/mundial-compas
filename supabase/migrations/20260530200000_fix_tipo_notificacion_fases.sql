-- Repara enum incompleto en producción (medio_tiempo / inicio_segundo_tiempo faltaban).

ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'medio_tiempo';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'inicio_segundo_tiempo';
