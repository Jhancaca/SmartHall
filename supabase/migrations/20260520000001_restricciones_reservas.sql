-- ==========================================
-- MIGRACIÓN DE BASE DE DATOS: RESTRICCIONES DE RESERVAS
-- SmartHall - supabase/migrations/20260520000001_restricciones_reservas.sql
-- ==========================================

-- Función para validar las reglas de negocio en la inserción/reprogramación de reservas
CREATE OR REPLACE FUNCTION fn_validar_reglas_reserva()
RETURNS TRIGGER AS $$
DECLARE
  dias_en_adelante INTEGER;
  conflicto BOOLEAN;
BEGIN
  -- Validar que la fecha sea al menos 48 horas en el futuro
  dias_en_adelante := (NEW.fecha_evento - CURRENT_DATE) * 24 + 
    EXTRACT(HOUR FROM (CURRENT_TIMESTAMP - DATE_TRUNC('day', CURRENT_TIMESTAMP)));
  
  IF dias_en_adelante < 48 THEN
    RAISE EXCEPTION 'Restricción de negocio: Las reservas deben solicitarse con al menos 48 horas de anticipación. (Fecha solicitada: %, actual: %)', 
      NEW.fecha_evento, CURRENT_DATE;
  END IF;

  -- Validar que la fecha no sea de más de 90 días en el futuro
  IF (NEW.fecha_evento - CURRENT_DATE) > 90 THEN
    RAISE EXCEPTION 'Restricción de negocio: No es posible reservar con más de 90 días de anticipación.';
  END IF;

  -- Solo validar conflicto de fecha si la reserva no está cancelada o rechazada
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

-- Crear trigger BEFORE INSERT OR UPDATE en la tabla reservas
DROP TRIGGER IF EXISTS tr_validar_reglas_reserva ON reservas;
CREATE TRIGGER tr_validar_reglas_reserva
BEFORE INSERT OR UPDATE ON reservas
FOR EACH ROW
EXECUTE FUNCTION fn_validar_reglas_reserva();
