-- ==========================================
-- COMANDOS DE VERIFICACIÓN Y DEPURACIÓN
-- ==========================================
-- Este archivo contiene consultas SQL útiles para verificar el estado
-- del sistema de notificaciones en Supabase. Copiar y pegar cada consulta
-- en el SQL Editor de Supabase para diagnosticar problemas.
--
-- CUÁNDO EJECUTAR: Cuando se sospeche que las notificaciones no funcionan
-- correctamente (no aparecen, no se insertan, Realtime no actualiza, etc.).
-- ==========================================

-- ==========================================
-- 1. VERIFICAR ESTRUCTURA DE LA TABLA NOTIFICACIONES
-- ==========================================
-- Muestra las columnas y sus tipos de datos para confirmar que la tabla
-- tiene la estructura esperada (incluyendo la columna 'vinculo').
-- ==========================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notificaciones';

-- ==========================================
-- 2. VERIFICAR ADMINISTRADORES Y SUPERVISORES
-- ==========================================
-- Muestra los usuarios con rol de administrador o supervisor.
-- Estos son los que deberían recibir notificaciones del sistema
-- (aprobación de reservas, etc.).
-- ==========================================
SELECT u.id, u.email, p.nombre as rol
FROM usuarios u
JOIN perfiles p ON u.perfil_id = p.id
WHERE p.nombre IN ('administrador', 'supervisor');

-- ==========================================
-- 3. VERIFICAR TOTAL DE NOTIFICACIONES
-- ==========================================
-- Cuenta el total de notificaciones en la tabla.
-- Si el resultado es 0, significa que no se ha insertado ninguna notificación.
-- ==========================================
SELECT count(*) as total_notificaciones FROM notificaciones;

-- ==========================================
-- 4. VER ÚLTIMAS 5 NOTIFICACIONES ENVIADAS
-- ==========================================
-- Muestra las 5 notificaciones más recientes para verificar si se están
-- insertando correctamente en la tabla.
-- ==========================================
SELECT created_at, titulo, mensaje, usuario_id, vinculo 
FROM notificaciones 
ORDER BY created_at DESC 
LIMIT 5;

-- ==========================================
-- 5. VERIFICAR SI REALTIME ESTÁ HABILITADO
-- ==========================================
-- Verifica si la tabla 'notificaciones' está incluida en la publicación
-- de Supabase Realtime. Si no aparece, Realtime no está habilitado.
-- ==========================================
SELECT * FROM pg_publication_tables WHERE tablename = 'notificaciones';

-- ==========================================
-- 6. VERIFICAR NOTIFICACIONES PENDIENTES DEL USUARIO ACTUAL
-- ==========================================
-- Cuenta las notificaciones no leídas del usuario que ejecuta la consulta.
-- Reemplaza 'TU_UUID_AQUÍ' por tu ID si lo conoces,
-- o usa auth.uid() si estás en la consola de Supabase.
-- ==========================================
SELECT count(*) FROM notificaciones WHERE usuario_id = auth.uid() AND leida = false;
