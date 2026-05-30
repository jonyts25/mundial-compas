-- Notificación cuando hay alineaciones confirmadas

ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'alineaciones';
