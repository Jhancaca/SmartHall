-- Script de Reparación Integral de Notificaciones
-- 1. Estructura de la Tabla
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS vinculo TEXT;

-- 2. Políticas de Seguridad (RLS)
-- Aseguramos que el sistema pueda insertar desde cualquier parte del código
DROP POLICY IF EXISTS "Sistema puede insertar notificaciones" ON notificaciones;
CREATE POLICY "Sistema puede insertar notificaciones" ON notificaciones 
FOR INSERT WITH CHECK (true);

-- Aseguramos que el usuario vea sus notificaciones (basado en auth.uid())
DROP POLICY IF EXISTS "Usuarios ven sus propias notificaciones" ON notificaciones;
CREATE POLICY "Usuarios ven sus propias notificaciones" ON notificaciones 
FOR SELECT USING (auth.uid() = usuario_id);

-- Permitir actualización (marcar como leída)
DROP POLICY IF EXISTS "Usuarios pueden marcar como leídas sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios pueden marcar como leídas sus notificaciones" ON notificaciones 
FOR UPDATE USING (auth.uid() = usuario_id);

-- 3. Habilitar Realtime (IMPORTANTE)
-- Esto permite que la campana se actualice sin refrescar la página
BEGIN;
  -- Intentar añadir a la publicación existente de Supabase
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
    ELSE
      CREATE PUBLICATION supabase_realtime FOR TABLE notificaciones;
    END IF;
  EXCEPTION
    WHEN others THEN 
      RAISE NOTICE 'No se pudo habilitar Realtime automáticamente. Por favor, actívalo manualmente en el Dashboard de Supabase (Database -> Replication).';
  END $$;
COMMIT;

-- 4. Recargar esquema
NOTIFY pgrst, 'reload schema';
