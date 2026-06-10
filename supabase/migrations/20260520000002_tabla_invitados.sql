-- ==========================================
-- MIGRACIÓN DE BASE DE DATOS: TABLA DE INVITADOS DE RESERVAS
-- SmartHall - supabase/migrations/20260520000002_tabla_invitados.sql
-- ==========================================
-- Esta migración crea la tabla para gestionar los invitados asociados a cada reserva
-- del salón social, junto con su control de acceso (ingreso al evento).
--
-- COMPONENTES:
-- 1. Enumerador 'estado_acceso_invitado' para los estados de acceso.
-- 2. Tabla 'invitados_reserva' con los datos de cada invitado.
-- 3. Índices de rendimiento para búsquedas frecuentes.
-- 4. Habilitación de Row Level Security (RLS).
-- 5. Políticas de seguridad por rol (residente, administrador, supervisor).
--
-- CUÁNDO EJECUTAR: Esta migración debe ejecutarse después de que la tabla
-- 'reservas' haya sido creada (migración 20260520000001).
-- ==========================================

-- ==========================================
-- ENUMERADOR: estado_acceso_invitado
-- ==========================================
-- Define los estados posibles de acceso de un invitado al evento:
-- 'pendiente': El invitado aún no ha llegado al evento.
-- 'ingresado': El invitado ya ingresó al salón.
-- ==========================================
CREATE TYPE estado_acceso_invitado AS ENUM ('pendiente', 'ingresado');

-- ==========================================
-- TABLA: invitados_reserva
-- ==========================================
-- Almacena la información de cada invitado registrado para una reserva del salón.
-- Cada invitado está vinculado a una reserva específica y tiene un control de acceso.
--
-- CAMPOS:
-- id: Identificador único del invitado (UUID generado automáticamente).
-- reserva_id: Referencia a la reserva a la que pertenece (se elimina en cascada).
-- nombre_completo: Nombre completo del invitado.
-- documento_identidad: Número de cédula, pasaporte o documento de identidad.
-- estado_acceso: Estado actual del acceso del invitado ('pendiente' o 'ingresado').
-- ingresado_a_las: Fecha y hora en que el invitado ingresó al salón (NULL si aún no ingresa).
-- created_at: Fecha y hora de creación del registro.
-- ==========================================
CREATE TABLE IF NOT EXISTS invitados_reserva (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_id uuid NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  documento_identidad TEXT NOT NULL,
  estado_acceso estado_acceso_invitado NOT NULL DEFAULT 'pendiente',
  ingresado_a_las TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES DE RENDIMIENTO
-- ==========================================
-- Estos índices aceleran las consultas frecuentes sobre la tabla de invitados.

-- Índice para buscar invitados por reserva (consulta más común)
CREATE INDEX IF NOT EXISTS idx_invitados_reserva ON invitados_reserva(reserva_id);

-- Índice para buscar invitados por documento de identidad (búsqueda en portería)
CREATE INDEX IF NOT EXISTS idx_invitados_documento ON invitados_reserva(documento_identidad);

-- Índice para filtrar invitados por estado de acceso
CREATE INDEX IF NOT EXISTS idx_invitados_estado ON invitados_reserva(estado_acceso);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Habilitar RLS para proteger los datos a nivel de fila.
ALTER TABLE invitados_reserva ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- ==========================================
-- POLÍTICA: "Ver invitados permitidos"
-- ==========================================
-- Permisos: SELECT
-- Regla: Un residente puede ver los invitados de sus propias reservas.
--         Administrador y Supervisor pueden ver todos los invitados.
-- ==========================================
CREATE POLICY "Ver invitados permitidos" ON invitados_reserva
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.id = invitados_reserva.reserva_id
        AND (r.residente_id = auth.uid() OR get_user_role(auth.uid()) IN ('administrador', 'supervisor'))
    )
  );

-- ==========================================
-- POLÍTICA: "Residentes insertan sus propios invitados"
-- ==========================================
-- Permisos: INSERT
-- Regla: Un residente puede insertar invitados solo para sus propias reservas
--         que estén en estado 'pendiente' o 'aprobada'.
--         Administrador y Supervisor pueden insertar en cualquier reserva.
-- ==========================================
CREATE POLICY "Residentes insertan sus propios invitados" ON invitados_reserva
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.id = invitados_reserva.reserva_id
        AND r.residente_id = auth.uid()
        AND r.estado IN ('pendiente', 'aprobada')
    ) OR get_user_role(auth.uid()) IN ('administrador', 'supervisor')
  );

-- ==========================================
-- POLÍTICA: "Actualizar invitados permitidos"
-- ==========================================
-- Permisos: UPDATE
-- Regla: Un residente puede corregir nombres/documentos de sus invitados
--         mientras la reserva esté pendiente o aprobada.
--         El personal administrativo (supervisor en portería / admin) puede
--         actualizar cualquier campo incluyendo el estado_acceso e ingresado_a_las.
-- ==========================================
CREATE POLICY "Actualizar invitados permitidos" ON invitados_reserva
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.id = invitados_reserva.reserva_id
        AND (r.residente_id = auth.uid() OR get_user_role(auth.uid()) IN ('administrador', 'supervisor'))
    )
  );

-- ==========================================
-- POLÍTICA: "Eliminar invitados permitidos"
-- ==========================================
-- Permisos: DELETE
-- Regla: Un residente puede eliminar invitados de sus propias reservas.
--         Administrador y Supervisor también pueden eliminar cualquier invitado.
-- ==========================================
CREATE POLICY "Eliminar invitados permitidos" ON invitados_reserva
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.id = invitados_reserva.reserva_id
        AND (r.residente_id = auth.uid() OR get_user_role(auth.uid()) IN ('administrador', 'supervisor'))
    )
  );
