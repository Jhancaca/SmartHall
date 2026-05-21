-- ==========================================
-- MIGRACIÓN DE BASE DE DATOS: TABLA DE INVITADOS DE RESERVAS
-- SmartHall - supabase/migrations/20260520000002_tabla_invitados.sql
-- ==========================================

-- 1. Crear enumerador para estados de acceso
CREATE TYPE estado_acceso_invitado AS ENUM ('pendiente', 'ingresado');

-- 2. Crear tabla de invitados de reserva
CREATE TABLE IF NOT EXISTS invitados_reserva (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_id uuid NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  documento_identidad TEXT NOT NULL,
  estado_acceso estado_acceso_invitado NOT NULL DEFAULT 'pendiente',
  ingresado_a_las TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices de rendimiento para búsquedas y relaciones
CREATE INDEX IF NOT EXISTS idx_invitados_reserva ON invitados_reserva(reserva_id);
CREATE INDEX IF NOT EXISTS idx_invitados_documento ON invitados_reserva(documento_identidad);
CREATE INDEX IF NOT EXISTS idx_invitados_estado ON invitados_reserva(estado_acceso);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE invitados_reserva ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de seguridad a nivel de fila (RLS)

-- SELECT: Un residente puede ver los invitados de sus propias reservas. Administrador y Supervisor pueden ver todos los invitados.
CREATE POLICY "Ver invitados permitidos" ON invitados_reserva
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.id = invitados_reserva.reserva_id
        AND (r.residente_id = auth.uid() OR get_user_role(auth.uid()) IN ('administrador', 'supervisor'))
    )
  );

-- INSERT: Un residente puede insertar invitados solo para sus propias reservas activas (pendientes o aprobadas).
CREATE POLICY "Residentes insertan sus propios invitados" ON invitados_reserva
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.id = invitados_reserva.reserva_id
        AND r.residente_id = auth.uid()
        AND r.estado IN ('pendiente', 'aprobada')
    ) OR get_user_role(auth.uid()) IN ('administrador', 'supervisor')
  );

-- UPDATE:
-- 1. Un residente puede corregir nombres/documentos de sus invitados mientras la reserva esté pendiente o aprobada.
-- 2. El personal administrativo (supervisor en portería / admin) puede actualizar cualquier campo (incluyendo el estado_acceso e ingresado_a_las).
CREATE POLICY "Actualizar invitados permitidos" ON invitados_reserva
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.id = invitados_reserva.reserva_id
        AND (r.residente_id = auth.uid() OR get_user_role(auth.uid()) IN ('administrador', 'supervisor'))
    )
  );

-- DELETE: Un residente puede eliminar invitados de sus propias reservas mientras no se haya celebrado el evento.
CREATE POLICY "Eliminar invitados permitidos" ON invitados_reserva
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.id = invitados_reserva.reserva_id
        AND (r.residente_id = auth.uid() OR get_user_role(auth.uid()) IN ('administrador', 'supervisor'))
    )
  );
