-- Reparar la relación entre auditoria y usuarios para permitir JOINS en PostgREST
-- Paso 1: Eliminar la restricción existente (si existe)
-- Nota: El nombre de la restricción suele ser automatico, pero podemos intentar forzar el cambio del tipo de referencia.

ALTER TABLE auditoria DROP CONSTRAINT IF EXISTS auditoria_usuario_id_fkey;

-- Paso 2: Añadir la referencia correcta a public.usuarios
ALTER TABLE auditoria 
ADD CONSTRAINT auditoria_usuario_id_fkey 
FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);

-- Repetir para notificaciones por si acaso
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_usuario_id_fkey;

ALTER TABLE notificaciones 
ADD CONSTRAINT notificaciones_usuario_id_fkey 
FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

-- Notificar a Supabase de que el esquema ha cambiado (PostgREST cache)
NOTIFY pgrst, 'reload schema';
