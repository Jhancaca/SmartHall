-- Actualizar política de RLS para que los residentes puedan ver los días ocupados
-- Paso 1: Eliminar la política restrictiva anterior
DROP POLICY IF EXISTS "Residente ve sus propias reservas" ON reservas;

-- Paso 2: Crear la nueva política que permite ver reservas aprobadas de otros
-- pero mantiene la privacidad de las pendientes/rechazadas/canceladas ajenas.
CREATE POLICY "Selección de reservas para todos los roles" ON reservas 
FOR SELECT USING (
  estado = 'aprobada' OR 
  auth.uid() = residente_id OR 
  get_user_role(auth.uid()) IN ('administrador', 'supervisor')
);

-- Asegurarse de que el caché de PostgREST se actualice
NOTIFY pgrst, 'reload schema';
