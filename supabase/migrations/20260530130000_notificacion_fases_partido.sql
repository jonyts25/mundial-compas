-- Tipos de notificación para fases del partido (medio tiempo, 2.º tiempo)

ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'medio_tiempo';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'inicio_segundo_tiempo';
