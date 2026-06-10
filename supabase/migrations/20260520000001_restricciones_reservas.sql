-- ==========================================
-- MIGRACIÓN DE BASE DE DATOS: RESTRICCIONES DE RESERVAS
-- SmartHall - supabase/migrations/20260520000001_restricciones_reservas.sql
-- ==========================================
-- Esta migración crea una función y un trigger que validan las reglas de negocio
-- para la inserción y actualización de reservas del salón social.
--
-- REGLAS QUE VALIDA:
-- 1. Las reservas deben solicitarse con al menos 48 horas de anticipación.
-- 2. No se pueden reservar fechas con más de 90 días de anticipación.
-- 3. Solo se permite una reserva activa (pendiente o aprobada) por día.
--
-- CUÁNDO EJECUTAR: Esta migración debe ejecutarse después de que la tabla
-- 'reservas' haya sido creada. Es una migración incremental segura.
-- ==========================================

-- ==========================================
-- FUNCIÓN: fn_validar_reglas_reserva
-- ==========================================
-- Función que valida las reglas de negocio en la inserción/reprogramación de reservas.
-- Se ejecuta como trigger BEFORE INSERT OR UPDATE sobre la tabla 'reservas'.
--
-- Parámetros: Ninguno (utiliza NEW implicitamente).
-- Retorna: NEW (el registro validado) o lanza una excepción si falla la validación.
-- ==========================================
CREATE OR REPLACE FUNCTION fn_validar_reglas_reserva()
RETURNS TRIGGER AS $$
DECLARE
  dias_en_adelante INTEGER;
  conflicto BOOLEAN;
BEGIN
  -- Calcular las horas de anticipación con respecto a la fecha actual.
  -- Se usa la diferencia en días multiplicada por 24 horas + las horas del día actual.
  dias_en_adelante := (NEW.fecha_evento - CURRENT_DATE) * 24 + 
    EXTRACT(HOUR FROM (CURRENT_TIMESTAMP - DATE_TRUNC('day', CURRENT_TIMESTAMP)));
  
  -- Validar que la fecha sea al menos 48 horas en el futuro
  IF dias_en_adelante < 48 THEN
    RAISE EXCEPTION 'Restricción de negocio: Las reservas deben solicitarse con al menos 48 horas de anticipación. (Fecha solicitada: %, actual: %)', 
      NEW.fecha_evento, CURRENT_DATE;
  END IF;

  -- Validar que la fecha no sea de más de 90 días en el futuro
  IF (NEW.fecha_evento - CURRENT_DATE) > 90 THEN
    RAISE EXCEPTION 'Restricción de negocio: No es posible reservar con más de 90 días de anticipación.';
  END IF;

  -- Solo validar conflicto de fecha si la reserva no está cancelada o rechazada
  -- (Las reservas canceladas/rechazadas no ocupan el día)
  IF NEW.estado IN ('pendiente', 'aprobada') THEN
    -- Verificar conflicto: ¿existe otra reserva (pendiente o aprobada) para ese mismo día?
    SELECT EXISTS (
      SELECT 1 FROM reservas
      WHERE fecha_evento = NEW.fecha_evento
        AND estado IN ('pendiente', 'aprobada')
        AND (NEW.id IS NULL OR id != NEW.id)
    ) INTO conflicto;

    IF conflicto THEN
      RAISE EXCEPTION 'Conflicto de fecha: El salón social ya cuenta con una reserva activa (pendiente o aprobada) para el día %. Solo se permite una reserva por día.', 
        NEW.fecha_evento;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGER: tr_validar_reglas_reserva
-- ==========================================
-- Se ejecuta BEFORE INSERT OR UPDATE sobre la tabla 'reservas'.
-- Intercepta cada fila antes de ser insertada o actualizada y ejecuta
-- la función fn_validar_reglas_reserva para validar las reglas de negocio.
-- Si la validación falla, lanza una excepción y cancela la operación.
-- ==========================================
DROP TRIGGER IF EXISTS tr_validar_reglas_reserva ON reservas;
CREATE TRIGGER tr_validar_reglas_reserva
BEFORE INSERT OR UPDATE ON reservas
FOR EACH ROW
EXECUTE FUNCTION fn_validar_reglas_reserva();
