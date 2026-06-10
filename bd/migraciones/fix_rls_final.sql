-- ==========================================
-- REPARACIÓN FINAL DE RLS (Row Level Security)
-- ==========================================
-- Esta migración corrige las políticas de RLS en las tablas 'reservas'
-- y 'usuarios' para resolver problemas de acceso:
-- 1. Permite que todos los usuarios vean las reservas aprobadas (necesario para el calendario).
-- 2. Permite que los supervisores vean los nombres de los residentes.
--
-- CUÁNDO EJECUTAR: Después de que las migraciones base y la migración
-- de reservas hayan sido ejecutadas. Es una corrección de políticas existentes.
-- ==========================================

-- ==========================================
-- 1. REPARAR RLS DE RESERVAS
-- ==========================================
-- Eliminar la política anterior restringida que solo permitía ver reservas propias.
-- Crear una nueva política que permita:
-- - Ver reservas aprobadas (necesario para que el calendario muestre días ocupados).
-- - Ver las propias reservas (cualquier estado).
-- - Administrador y Supervisor pueden ver todas las reservas.
-- ==========================================
DROP POLICY IF EXISTS "Residente ve sus propias reservas" ON reservas;
DROP POLICY IF EXISTS "Selección de reservas para todos los roles" ON reservas; -- Por si se ejecutó el anterior

CREATE POLICY "Reservas aprobadas son públicas" ON reservas 
FOR SELECT USING (
  estado = 'aprobada' OR 
  auth.uid() = residente_id OR 
  get_user_role(auth.uid()) IN ('administrador', 'supervisor')
);

-- ==========================================
-- 2. REPARAR RLS DE USUARIOS
-- ==========================================
-- Crear política para que los supervisores puedan ver los datos de los residentes.
-- Esto es necesario para que al supervisor le aparezcan los nombres de los residentes
-- en las vistas de reservas y préstamos.
-- ==========================================
DROP POLICY IF EXISTS "Supervisores pueden select en usuarios" ON usuarios;

CREATE POLICY "Supervisores pueden select en usuarios" ON usuarios 
FOR SELECT USING (get_user_role(auth.uid()) = 'supervisor');

-- ==========================================
-- 3. RECARGAR ESQUEMA DE POSTGREST
-- ==========================================
-- Notificar a PostgREST que el esquema ha cambiado para que las nuevas
-- políticas entren en vigor inmediatamente.
-- ==========================================
NOTIFY pgrst, 'reload schema';
