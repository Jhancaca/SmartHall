-- ==========================================
-- REPARACIÓN DE RELACIONES FK (FOREIGN KEYS)
-- ==========================================
-- Esta migración corrige las claves foráneas (FK) en las tablas 'auditoria'
-- y 'notificaciones' para asegurar que apuntan correctamente a la tabla
-- 'public.usuarios'. Esto permite realizar JOINs en PostgREST entre
-- estas tablas y la tabla de usuarios.
--
-- CUÁNDO EJECUTAR: Si las consultas con JOIN entre auditoria/notificaciones
-- y usuarios no funcionan correctamente en PostgREST/Supabase.
-- ==========================================

-- ==========================================
-- REPARACIÓN FK EN TABLA: auditoria
-- ==========================================
-- Eliminar la restricción FK existente (si existe) y recrearla
-- apuntando explícitamente a public.usuarios(id).
-- Esto corrige problemas donde PostgREST no puede resolver la relación.
-- ==========================================
ALTER TABLE auditoria DROP CONSTRAINT IF EXISTS auditoria_usuario_id_fkey;

ALTER TABLE auditoria 
ADD CONSTRAINT auditoria_usuario_id_fkey 
FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);

-- ==========================================
-- REPARACIÓN FK EN TABLA: notificaciones
-- ==========================================
-- Eliminar la restricción FK existente (si existe) y recrearla
-- apuntando explícitamente a public.usuarios(id) con ON DELETE CASCADE.
-- CASCADE asegura que si se elimina un usuario, sus notificaciones se eliminan también.
-- ==========================================
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_usuario_id_fkey;

ALTER TABLE notificaciones 
ADD CONSTRAINT notificaciones_usuario_id_fkey 
FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

-- ==========================================
-- RECARGAR ESQUEMA DE POSTGREST
-- ==========================================
-- Notificar a PostgREST que el esquema ha cambiado para que las nuevas
-- relaciones FK entren en vigor inmediatamente.
-- ==========================================
NOTIFY pgrst, 'reload schema';
