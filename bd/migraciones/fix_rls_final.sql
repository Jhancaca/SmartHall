-- 1. Reparar RLS de RESERVAS
-- Permitir que todos vean las reservas aprobadas (necesario para el calendario)
DROP POLICY IF EXISTS "Residente ve sus propias reservas" ON reservas;
DROP POLICY IF EXISTS "Selección de reservas para todos los roles" ON reservas; -- Por si se ejecutó el anterior

CREATE POLICY "Reservas aprobadas son públicas" ON reservas 
FOR SELECT USING (
  estado = 'aprobada' OR 
  auth.uid() = residente_id OR 
  get_user_role(auth.uid()) IN ('administrador', 'supervisor')
);

-- 2. Reparar RLS de USUARIOS
-- Permitir que los Supervisores también puedan ver los nombres de los residentes
DROP POLICY IF EXISTS "Supervisores pueden select en usuarios" ON usuarios;

CREATE POLICY "Supervisores pueden select en usuarios" ON usuarios 
FOR SELECT USING (get_user_role(auth.uid()) = 'supervisor');

-- 3. Notificar cambios
NOTIFY pgrst, 'reload schema';
