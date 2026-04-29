-- 1. Limpiar datos existentes que violan la nueva regla
-- Actualizamos cualquier reserva que exceda los 400 a 400 para poder aplicar la restricción
UPDATE reservas 
SET numero_invitados = 400 
WHERE numero_invitados > 400;

-- 2. Eliminar la restricción anterior si existe
ALTER TABLE reservas 
DROP CONSTRAINT IF EXISTS reservas_numero_invitados_check;

-- 3. Aplicar la nueva restricción de capacidad máxima
ALTER TABLE reservas 
ADD CONSTRAINT reservas_numero_invitados_check 
CHECK (numero_invitados > 0 AND numero_invitados <= 400);

-- 4. Comentario para auditoría
COMMENT ON COLUMN reservas.numero_invitados IS 'Número de invitados, máximo 400 según capacidad del salón.';
