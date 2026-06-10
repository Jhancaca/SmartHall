-- ==========================================
-- ACTUALIZACIÓN DE POLÍTICA RLS PARA RESERVAS
-- ==========================================
-- Esta migración reemplaza la política de visualización de reservas para
-- permitir que los residentes vean los días ocupados del salón (reservas
-- aprobadas de otros residentes), manteniendo la privacidad de las reservas
-- pendientes, rechazadas o canceladas ajenas.
--
-- CUÁNDO EJECUTAR: Después de que la tabla 'reservas' y su RLS hayan sido creados.
-- Esta es una corrección de la política de visualización original.
-- ==========================================

-- ==========================================
-- PASO 1: Eliminar la política restrictiva anterior
-- ==========================================
-- Se elimina la política que solo permitía ver las propias reservas.
-- Esto es necesario para que el calendario pueda mostrar los días ocupados.
-- ==========================================
DROP POLICY IF EXISTS "Residente ve sus propias reservas" ON reservas;

-- ==========================================
-- PASO 2: Crear la nueva política de visualización
-- ==========================================
-- La nueva política permite:
-- - Ver reservas aprobadas (de cualquier residente) → para el calendario.
-- - Ver las propias reservas (cualquier estado).
-- - Administrador y Supervisor pueden ver todas las reservas.
-- Las reservas pendientes/rechazadas/canceladas de otros residentes permanecen privadas.
-- ==========================================
CREATE POLICY "Selección de reservas para todos los roles" ON reservas 
FOR SELECT USING (
  estado = 'aprobada' OR 
  auth.uid() = residente_id OR 
  get_user_role(auth.uid()) IN ('administrador', 'supervisor')
);

-- ==========================================
-- RECARGAR ESQUEMA DE POSTGREST
-- ==========================================
-- Notificar a PostgREST que el esquema ha cambiado para que la nueva
-- política entre en vigor inmediatamente.
-- ==========================================
NOTIFY pgrst, 'reload schema';
