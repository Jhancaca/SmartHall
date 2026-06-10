-- ==========================================
-- SCRIPT DE REPARACIÓN INTEGRAL DE NOTIFICACIONES
-- ==========================================
-- Esta migración realiza una reparación completa del sistema de notificaciones:
-- 1. Agrega la columna 'vinculo' si no existe (para redirecciones al hacer clic).
-- 2. Recrea las políticas RLS para asegurar que funcionen correctamente.
-- 3. Habilita Realtime para que la campana de notificaciones se actualice en vivo.
-- 4. Recarga el esquema de PostgREST.
--
-- CUÁNDO EJECUTAR: Si las notificaciones no funcionan correctamente (no se insertan,
-- no aparecen en tiempo real, o la columna 'vinculo' no existe).
-- ==========================================

-- ==========================================
-- 1. ESTRUCTURA DE LA TABLA
-- ==========================================
-- Agregar la columna 'vinculo' si no existe.
-- Esta columna almacena la ruta de navegación al hacer clic en la notificación.
-- ==========================================
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS vinculo TEXT;

-- ==========================================
-- 2. POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================
-- Recrear las políticas para asegurar que el sistema pueda insertar notificaciones
-- desde cualquier parte del código y que los usuarios puedan ver y actualizar las suyas.
-- ==========================================

-- Política de inserción: El sistema puede insertar notificaciones para cualquier usuario.
-- Se ejecuta DROP antes por si la política ya existe con un nombre diferente.
DROP POLICY IF EXISTS "Sistema puede insertar notificaciones" ON notificaciones;
CREATE POLICY "Sistema puede insertar notificaciones" ON notificaciones 
FOR INSERT WITH CHECK (true);

-- Política de selección: Cada usuario solo ve sus propias notificaciones.
DROP POLICY IF EXISTS "Usuarios ven sus propias notificaciones" ON notificaciones;
CREATE POLICY "Usuarios ven sus propias notificaciones" ON notificaciones 
FOR SELECT USING (auth.uid() = usuario_id);

-- Política de actualización: Cada usuario puede marcar como leídas sus propias notificaciones.
DROP POLICY IF EXISTS "Usuarios pueden marcar como leídas sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios pueden marcar como leídas sus notificaciones" ON notificaciones 
FOR UPDATE USING (auth.uid() = usuario_id);

-- ==========================================
-- 3. HABILITAR REALTIME
-- ==========================================
-- Esto permite que la campana de notificaciones se actualice en tiempo real
-- sin necesidad de refrescar la página. La tabla se añade a la publicación
-- 'supabase_realtime' de Supabase.
-- ==========================================
BEGIN;
  -- Intentar añadir la tabla a la publicación existente de Supabase
  -- Si la publicación no existe, se crea una nueva.
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

-- ==========================================
-- 4. RECARGAR ESQUEMA DE POSTGREST
-- ==========================================
-- Notificar a PostgREST que el esquema ha cambiado para que las nuevas
-- políticas y columnas entren en vigor inmediatamente.
-- ==========================================
NOTIFY pgrst, 'reload schema';
