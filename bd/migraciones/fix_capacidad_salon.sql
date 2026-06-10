-- ==========================================
-- RESTRICCIÓN DE CAPACIDAD MÁXIMA DEL SALÓN
-- ==========================================
-- Esta migración actualiza la restricción de capacidad del salón social
-- para limitar el número máximo de invitados a 400 personas.
-- Primero limpia los datos existentes que violen la nueva regla,
-- luego elimina la restricción anterior y aplica la nueva.
--
-- CUÁNDO EJECUTAR: Después de que la tabla 'reservas' haya sido creada
-- y se necesite limitar la capacidad del salón.
-- ==========================================

-- ==========================================
-- PASO 1: Limpiar datos existentes que violan la nueva regla
-- ==========================================
-- Actualizar cualquier reserva que tenga más de 400 invitados
-- para que tenga exactamente 400 (el máximo permitido).
-- Esto es necesario antes de aplicar la nueva restricción.
-- ==========================================
UPDATE reservas 
SET numero_invitados = 400 
WHERE numero_invitados > 400;

-- ==========================================
-- PASO 2: Eliminar la restricción anterior
-- ==========================================
-- Se elimina la restricción CHECK existente sobre numero_invitados
-- para poder reemplazarla con la nueva que incluye el límite de 400.
-- ==========================================
ALTER TABLE reservas 
DROP CONSTRAINT IF EXISTS reservas_numero_invitados_check;

-- ==========================================
-- PASO 3: Aplicar la nueva restricción de capacidad máxima
-- ==========================================
-- Crear una nueva restricción CHECK que valide:
-- - El número de invitados debe ser mayor a 0.
-- - El número de invitados no puede exceder las 400 personas (capacidad del salón).
-- ==========================================
ALTER TABLE reservas 
ADD CONSTRAINT reservas_numero_invitados_check 
CHECK (numero_invitados > 0 AND numero_invitados <= 400);

-- ==========================================
-- COMENTARIO DE AUDITORÍA
-- ==========================================
-- Agregar un comentario descriptivo a la columna para documentación.
-- ==========================================
COMMENT ON COLUMN reservas.numero_invitados IS 'Número de invitados, máximo 400 según capacidad del salón.';
