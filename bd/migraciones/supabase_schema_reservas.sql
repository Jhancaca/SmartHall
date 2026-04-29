-- ==========================================
-- EXTENSIÓN DE SCHEMA PARA RESERVAS
-- Entrega 2 - SmartHall
-- ==========================================

-- 1. ENUMERADORES NUEVOS
CREATE TYPE estado_reserva AS ENUM ('pendiente', 'aprobada', 'rechazada', 'cancelada');

-- 2. TABLA DE RESERVAS
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
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_reservas_residente ON reservas(residente_id);
CREATE INDEX idx_reservas_fecha ON reservas(fecha_evento);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reservas_fecha_estado ON reservas(fecha_evento, estado);

-- 3. HABILITAR RLS
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE RLS PARA RESERVAS
-- Residente puede ver solo sus propias reservas
CREATE POLICY "Residente ve sus propias reservas" ON reservas 
  FOR SELECT USING (auth.uid() = residente_id OR get_user_role(auth.uid()) IN ('administrador', 'supervisor'));

-- Residente puede insertar reservas para sí mismo
CREATE POLICY "Residente puede crear sus propias reservas" ON reservas 
  FOR INSERT WITH CHECK (auth.uid() = residente_id);

-- Residente puede actualizar solo sus reservas si están en estado "pendiente" (para cancelar)
CREATE POLICY "Residente puede actualizar sus reservas pendientes" ON reservas 
  FOR UPDATE USING (auth.uid() = residente_id AND estado = 'pendiente');

-- Administrador puede hacer todo
CREATE POLICY "Administrador puede ver todas las reservas" ON reservas 
  FOR SELECT USING (get_user_role(auth.uid()) = 'administrador');

CREATE POLICY "Administrador puede insertar reservas" ON reservas 
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'administrador');

CREATE POLICY "Administrador puede actualizar todas las reservas" ON reservas 
  FOR UPDATE USING (get_user_role(auth.uid()) = 'administrador');

CREATE POLICY "Administrador puede eliminar todas las reservas" ON reservas 
  FOR DELETE USING (get_user_role(auth.uid()) = 'administrador');

-- Supervisor puede ver todas pero solo admin puede aprobar/rechazar
CREATE POLICY "Supervisor puede ver todas las reservas" ON reservas 
  FOR SELECT USING (get_user_role(auth.uid()) = 'supervisor');

-- 5. FUNCIÓN RPC PARA VALIDAR DISPONIBILIDAD DE FECHA
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
  -- Validar que la fecha sea al menos 48 horas en el futuro
  dias_en_adelante := (p_fecha - CURRENT_DATE) * 24 + 
    EXTRACT(HOUR FROM (CURRENT_TIMESTAMP - DATE_TRUNC('day', CURRENT_TIMESTAMP)));
  
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

-- 6. TRIGGER PARA ACTUALIZAR "actualizado_en" AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION trigger_actualizar_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_reservas_actualizado_en
BEFORE UPDATE ON reservas
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_timestamp();

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================
-- Para verificar: SELECT * FROM reservas LIMIT 0;
