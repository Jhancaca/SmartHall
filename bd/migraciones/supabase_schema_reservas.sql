-- ==========================================
-- EXTENSIÓN DE SCHEMA PARA RESERVAS
-- Entrega 2 - SmartHall
-- ==========================================
-- Esta migración crea la tabla de reservas del salón social junto con
-- el enumerador de estados, índices de rendimiento, políticas de RLS,
-- una función RPC para verificar disponibilidad y un trigger para
-- actualizar el timestamp automáticamente.
--
-- CUÁNDO EJECUTAR: Después de que las tablas base (usuarios, perfiles)
-- y la función get_user_role hayan sido creadas.
-- ==========================================

-- ==========================================
-- ENUMERADOR: estado_reserva
-- ==========================================
-- Define los estados posibles de una reserva:
-- 'pendiente': Reserva creada, esperando aprobación del administrador.
-- 'aprobada': Reserva aprobada, el evento puede realizarse.
-- 'rechazada': Reserva rechazada por el administrador.
-- 'cancelada': Reserva cancelada por el residente o el administrador.
-- ==========================================
CREATE TYPE estado_reserva AS ENUM ('pendiente', 'aprobada', 'rechazada', 'cancelada');

-- ==========================================
-- TABLA: reservas
-- ==========================================
-- Almacena las reservas del salón social realizadas por los residentes.
-- Cada reserva representa una solicitud para utilizar el salón en una fecha
-- y hora específica, con un tipo de evento y número de invitados.
--
-- CAMPOS:
-- id: Identificador único de la reserva (UUID generado automáticamente).
-- residente_id: Referencia al usuario residente que creó la reserva.
-- fecha_evento: Fecha en que se realizará el evento.
-- hora_inicio: Hora de inicio del evento (entre 12:00 y 23:00).
-- hora_fin: Hora de finalización del evento (debe ser mayor que hora_inicio).
-- tipo_evento: Tipo de evento (ej: Fiesta Infantil, Reunión Social).
-- numero_invitados: Cantidad de invitados al evento.
-- descripcion: Descripción opcional del evento.
-- estado: Estado actual de la reserva (pendiente, aprobada, rechazada, cancelada).
-- revisado_por: Referencia al administrador que revisó la reserva.
-- fecha_revision: Fecha y hora en que se revisó la reserva.
-- motivo_rechazo: Motivo del rechazo si aplica.
-- creado_en: Fecha y hora de creación de la reserva.
-- actualizado_en: Fecha y hora de la última actualización (se actualiza con trigger).
-- ==========================================
CREATE TABLE reservas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  residente_id uuid NOT NULL REFERENCES usuarios(id),
  fecha_evento DATE NOT NULL,
  hora_inicio TIME NOT NULL CHECK (hora_inicio >= '12:00:00' AND hora_inicio <= '23:00:00'),
  hora_fin TIME NOT NULL CHECK ((hora_fin > hora_inicio AND hora_fin <= '23:59:59') OR hora_fin = '00:00:00'),
  tipo_evento VARCHAR(100) NOT NULL,
  numero_invitados INTEGER NOT NULL CHECK (numero_invitados > 0),
  descripcion TEXT,
  estado estado_reserva NOT NULL DEFAULT 'pendiente',
  -- Campos de aprobación/rechazo
  revisado_por uuid REFERENCES usuarios(id),
  fecha_revision TIMESTAMPTZ,
  motivo_rechazo TEXT,
  -- Auditoría
  creo_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES DE RENDIMIENTO
-- ==========================================
-- Estos índices aceleran las consultas más frecuentes sobre reservas.

-- Índice para buscar reservas por residente
CREATE INDEX idx_reservas_residente ON reservas(residente_id);

-- Índice para buscar reservas por fecha
CREATE INDEX idx_reservas_fecha ON reservas(fecha_evento);

-- Índice para filtrar reservas por estado
CREATE INDEX idx_reservas_estado ON reservas(estado);

-- Índice compuesto para buscar reservas por fecha y estado (calendario)
CREATE INDEX idx_reservas_fecha_estado ON reservas(fecha_evento, estado);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Habilitar RLS para proteger los datos a nivel de fila.
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS) PARA RESERVAS
-- ==========================================

-- ==========================================
-- POLÍTICA: "Residente ve sus propias reservas"
-- ==========================================
-- Permisos: SELECT
-- Regla: El residente solo puede ver sus propias reservas.
--         Administrador y Supervisor pueden ver todas las reservas.
-- ==========================================
CREATE POLICY "Residente ve sus propias reservas" ON reservas 
  FOR SELECT USING (auth.uid() = residente_id OR get_user_role(auth.uid()) IN ('administrador', 'supervisor'));

-- ==========================================
-- POLÍTICA: "Residente puede crear sus propias reservas"
-- ==========================================
-- Permisos: INSERT
-- Regla: Solo el residente puede insertar reservas a su nombre.
-- ==========================================
CREATE POLICY "Residente puede crear sus propias reservas" ON reservas 
  FOR INSERT WITH CHECK (auth.uid() = residente_id);

-- ==========================================
-- POLÍTICA: "Residente puede actualizar sus reservas pendientes"
-- ==========================================
-- Permisos: UPDATE
-- Regla: El residente solo puede actualizar sus reservas que estén en estado 'pendiente'
--         (para cancelarlas antes de que sean revisadas).
-- ==========================================
CREATE POLICY "Residente puede actualizar sus reservas pendientes" ON reservas 
  FOR UPDATE USING (auth.uid() = residente_id AND estado = 'pendiente');

-- ==========================================
-- POLÍTICA: "Administrador puede ver todas las reservas"
-- ==========================================
-- Permisos: SELECT
-- Regla: El administrador puede consultar todas las reservas sin restricciones.
-- ==========================================
CREATE POLICY "Administrador puede ver todas las reservas" ON reservas 
  FOR SELECT USING (get_user_role(auth.uid()) = 'administrador');

-- ==========================================
-- POLÍTICA: "Administrador puede insertar reservas"
-- ==========================================
-- Permisos: INSERT
-- Regla: El administrador puede crear reservas para cualquier residente.
-- ==========================================
CREATE POLICY "Administrador puede insertar reservas" ON reservas 
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'administrador');

-- ==========================================
-- POLÍTICA: "Administrador puede actualizar todas las reservas"
-- ==========================================
-- Permisos: UPDATE
-- Regla: El administrador puede modificar cualquier reserva (aprobar, rechazar, etc.).
-- ==========================================
CREATE POLICY "Administrador puede actualizar todas las reservas" ON reservas 
  FOR UPDATE USING (get_user_role(auth.uid()) = 'administrador');

-- ==========================================
-- POLÍTICA: "Administrador puede eliminar todas las reservas"
-- ==========================================
-- Permisos: DELETE
-- Regla: El administrador puede eliminar cualquier reserva del sistema.
-- ==========================================
CREATE POLICY "Administrador puede eliminar todas las reservas" ON reservas 
  FOR DELETE USING (get_user_role(auth.uid()) = 'administrador');

-- ==========================================
-- POLÍTICA: "Supervisor puede ver todas las reservas"
-- ==========================================
-- Permisos: SELECT
-- Regla: El supervisor puede consultar todas las reservas.
--         Solo el administrador puede aprobar o rechazar.
-- ==========================================
CREATE POLICY "Supervisor puede ver todas las reservas" ON reservas 
  FOR SELECT USING (get_user_role(auth.uid()) = 'supervisor');

-- ==========================================
-- FUNCIÓN RPC: verificar_disponibilidad_reserva
-- ==========================================
-- Verifica si una fecha está disponible para reservar el salón social.
-- Valida las reglas de negocio: 48 horas mínimas de anticipación,
-- máximo 90 días de anticipación, y que no exista otra reserva activa
-- para la misma fecha.
--
-- Parámetros:
-- p_fecha: Fecha que se desea reservar.
-- p_reserva_id: ID de una reserva existente para excluir de la verificación
--                (útil al editar una reserva, NULL para reservas nuevas).
--
-- Retorna: JSON con 'disponible' (boolean) y 'mensaje' (texto descriptivo).
-- ==========================================
CREATE OR REPLACE FUNCTION verificar_disponibilidad_reserva(
  p_fecha DATE,
  p_reserva_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  conflicto BOOLEAN;
  dias_en_adelante INTEGER;
  dias_maximo INTEGER;
BEGIN
  -- Calcular las horas de anticipación con respecto a la fecha actual
  dias_en_adelante := (p_fecha - CURRENT_DATE) * 24 + 
    EXTRACT(HOUR FROM (CURRENT_TIMESTAMP - DATE_TRUNC('day', CURRENT_TIMESTAMP)));
  
  -- Validar que la fecha sea al menos 48 horas en el futuro
  IF dias_en_adelante < 48 THEN
    RETURN json_build_object(
      'disponible', false,
      'mensaje', 'Las reservas deben solicitarse con al menos 48 horas de anticipación.'
    );
  END IF;

  -- Validar que la fecha no sea más de 90 días en el futuro
  IF (p_fecha - CURRENT_DATE) > 90 THEN
    RETURN json_build_object(
      'disponible', false,
      'mensaje', 'No es posible reservar con más de 90 días de anticipación.'
    );
  END IF;

  -- Verificar conflicto: ¿existe otra reserva (pendiente o aprobada) para esa fecha?
  SELECT EXISTS (
    SELECT 1 FROM reservas
    WHERE fecha_evento = p_fecha
      AND estado IN ('pendiente', 'aprobada')
      AND (p_reserva_id IS NULL OR id != p_reserva_id)
  ) INTO conflicto;

  IF conflicto THEN
    RETURN json_build_object(
      'disponible', false,
      'mensaje', 'El salón ya tiene una reserva para esa fecha. Elige otro día.'
    );
  END IF;

  RETURN json_build_object('disponible', true, 'mensaje', '');
END;
$$;

-- ==========================================
-- FUNCIÓN: trigger_actualizar_timestamp
-- ==========================================
-- Actualiza automáticamente el campo 'actualizado_en' con la fecha y hora
-- actual cada vez que se modifica un registro en la tabla 'reservas'.
-- Se ejecuta como trigger BEFORE UPDATE.
-- ==========================================
CREATE OR REPLACE FUNCTION trigger_actualizar_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

-- ==========================================
-- TRIGGER: tr_reservas_actualizado_en
-- ==========================================
-- Se ejecuta BEFORE UPDATE sobre la tabla 'reservas'.
-- Actualiza el campo 'actualizado_en' automáticamente antes de cada
-- actualización para mantener un registro preciso de la última modificación.
-- ==========================================
CREATE TRIGGER tr_reservas_actualizado_en
BEFORE UPDATE ON reservas
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_timestamp();

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================
-- Para verificar: SELECT * FROM reservas LIMIT 0;
