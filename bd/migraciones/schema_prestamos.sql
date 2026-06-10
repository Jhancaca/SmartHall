-- ==========================================
-- SCHEMA DE PRÉSTAMOS DE INSUMOS
-- ==========================================
-- Esta migración crea la tabla de préstamos de insumos del inventario
-- del salón social. Permite a los residentes solicitar insumos para sus
-- eventos aprobados y al personal administrativo gestionar el ciclo
-- de préstamo (solicitud → entrega → devolución).
--
-- CUÁNDO EJECUTAR: Después de que las tablas 'reservas' e 'insumos'
-- hayan sido creadas.
-- ==========================================

-- ==========================================
-- ENUMERADOR: estado_prestamo
-- ==========================================
-- Define los estados del ciclo de vida de un préstamo:
-- 'solicitado': El residente solicitó el préstamo, pendiente de entrega.
-- 'entregado': El administrador/supervisor entregó el insumo al residente.
-- 'devuelto': El residente devolvió el insumo correctamente.
-- 'rechazado': El administrador rechazó la solicitud de préstamo.
-- 'danado': El insumo fue devuelto con daños (registrado para auditoría).
-- ==========================================
CREATE TYPE estado_prestamo AS ENUM ('solicitado', 'entregado', 'devuelto', 'rechazado', 'danado');

-- ==========================================
-- TABLA: prestamos_insumos
-- ==========================================
-- Almacena los registros de préstamo de insumos del inventario vinculados
-- a reservas aprobadas. Cada préstamo indica qué insumo, en qué cantidad
-- y en qué estado se encuentra.
--
-- CAMPOS:
-- id: Identificador único del préstamo (UUID generado automáticamente).
-- reserva_id: Referencia a la reserva a la que pertenece el préstamo (cascade).
-- insumo_id: Referencia al insumo prestado (RESTRICT: no se puede borrar un insumo con préstamos activos).
-- cantidad: Cantidad de unidades prestadas.
-- estado: Estado actual del préstamo (solicitado, entregado, devuelto, rechazado, danado).
-- observaciones_residente: Notas o comentarios del residente al solicitar.
-- observaciones_admin: Notas o comentarios del administrador al entregar/devolver.
-- fecha_prestamo: Fecha y hora en que se entregó el insumo al residente.
-- fecha_devolucion: Fecha y hora en que el residente devolvió el insumo.
-- created_at: Fecha y hora de creación del registro.
-- updated_at: Fecha y hora de la última actualización.
-- ==========================================
CREATE TABLE prestamos_insumos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_id uuid REFERENCES reservas(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  estado estado_prestamo DEFAULT 'solicitado',
  observaciones_residente TEXT,
  observaciones_admin TEXT,
  fecha_prestamo TIMESTAMPTZ,
  fecha_devolucion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Habilitar RLS para proteger los datos de préstamos a nivel de fila.
ALTER TABLE prestamos_insumos ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- ==========================================
-- POLÍTICA: "Usuarios pueden ver sus propios préstamos"
-- ==========================================
-- Permisos: SELECT
-- Regla: Un residente solo puede ver los préstamos de sus propias reservas.
-- Se verifica la relación préstamo → reserva → residente.
-- ==========================================
CREATE POLICY "Usuarios pueden ver sus propios prestamos" ON prestamos_insumos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reservas r 
      WHERE r.id = prestamos_insumos.reserva_id 
      AND r.residente_id = auth.uid()
    )
  );

-- ==========================================
-- POLÍTICA: "Admin/Supervisor pueden ver todos los préstamos"
-- ==========================================
-- Permisos: SELECT
-- Regla: Administrador y Supervisor pueden consultar todos los préstamos
--         para gestionar entregas y devoluciones.
-- ==========================================
CREATE POLICY "Admin/Supervisor pueden ver todos los prestamos" ON prestamos_insumos
  FOR SELECT USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));

-- ==========================================
-- POLÍTICA: "Residentes pueden solicitar préstamos"
-- ==========================================
-- Permisos: INSERT
-- Regla: Un residente puede solicitar préstamos solo para sus propias reservas
--         que estén en estado 'aprobada' (no para reservas pendientes o rechazadas).
-- ==========================================
CREATE POLICY "Residentes pueden solicitar prestamos" ON prestamos_insumos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservas r 
      WHERE r.id = prestamos_insumos.reserva_id 
      AND r.residente_id = auth.uid()
      AND r.estado = 'aprobada'
    )
  );

-- ==========================================
-- POLÍTICA: "Admin/Supervisor pueden gestionar préstamos"
-- ==========================================
-- Permisos: ALL (SELECT, INSERT, UPDATE, DELETE)
-- Regla: Administrador y Supervisor tienen control total sobre los préstamos:
--         pueden aprobar, rechazar, registrar entregas y devoluciones.
-- ==========================================
CREATE POLICY "Admin/Supervisor pueden gestionar prestamos" ON prestamos_insumos
  FOR ALL USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
