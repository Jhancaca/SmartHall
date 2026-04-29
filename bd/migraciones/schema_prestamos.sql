CREATE TYPE estado_prestamo AS ENUM ('solicitado', 'entregado', 'devuelto', 'rechazado', 'danado');

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

-- RLS
ALTER TABLE prestamos_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios prestamos" ON prestamos_insumos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reservas r 
      WHERE r.id = prestamos_insumos.reserva_id 
      AND r.residente_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Supervisor pueden ver todos los prestamos" ON prestamos_insumos
  FOR SELECT USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));

CREATE POLICY "Residentes pueden solicitar prestamos" ON prestamos_insumos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservas r 
      WHERE r.id = prestamos_insumos.reserva_id 
      AND r.residente_id = auth.uid()
      AND r.estado = 'aprobada'
    )
  );

CREATE POLICY "Admin/Supervisor pueden gestionar prestamos" ON prestamos_insumos
  FOR ALL USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
