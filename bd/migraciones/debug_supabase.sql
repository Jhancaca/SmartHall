-- COMANDOS DE VERIFICACIÓN (Copia y pega en el SQL Editor de Supabase)

-- 1. Verificar estructura de la tabla notificaciones
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notificaciones';

-- 2. Verificar cuántos administradores y supervisores hay (son los que deberían recibir avisos)
SELECT u.id, u.email, p.nombre as rol
FROM usuarios u
JOIN perfiles p ON u.perfil_id = p.id
WHERE p.nombre IN ('administrador', 'supervisor');

-- 3. Verificar si existen notificaciones en la tabla
SELECT count(*) as total_notificaciones FROM notificaciones;

-- 4. Ver las últimas 5 notificaciones enviadas (para ver si se están insertando)
SELECT created_at, titulo, mensaje, usuario_id, vinculo 
FROM notificaciones 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Verificar si Realtime está habilitado para la tabla
SELECT * FROM pg_publication_tables WHERE tablename = 'notificaciones';

-- 6. Verificar si el usuario actual (tú) tiene notificaciones pendientes
-- Reemplaza 'TU_UUID_AQUÍ' por tu ID si lo conoces, o usa auth.uid() si estás en la consola de Supabase
SELECT count(*) FROM notificaciones WHERE usuario_id = auth.uid() AND leida = false;
