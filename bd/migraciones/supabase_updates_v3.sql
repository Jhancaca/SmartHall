-- ==========================================
-- MEJORAS SMARTHALL - ENTREGA 3
-- ==========================================

-- 1. TABLA DE CONFIGURACIONES DEL SISTEMA (Select Lists Dinámicos)
CREATE TABLE IF NOT EXISTS configuraciones_sistema (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL, -- Ej: 'tipo_evento', 'unidad_insumo', 'estado_reserva'
  clave TEXT NOT NULL,      -- Ej: 'social', 'corporativo', 'unidad', 'caja'
  valor TEXT NOT NULL,      -- Ej: 'Evento Social', 'Evento Corporativo', 'Unidad', 'Caja'
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria, clave)
);

-- Insertar valores iniciales para Tipos de Evento
INSERT INTO configuraciones_sistema (categoria, clave, valor, orden) VALUES
('tipo_evento', 'fiesta_infantil', 'Fiesta Infantil', 1),
('tipo_evento', 'reunion_social', 'Reunión Social', 2),
('tipo_evento', 'asamblea', 'Asamblea de Copropietarios', 3),
('tipo_evento', 'otro', 'Otro', 4)
ON CONFLICT DO NOTHING;

-- 2. TABLA DE NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT DEFAULT 'info', -- 'success', 'warning', 'error', 'info'
  leida BOOLEAN DEFAULT false,
  metadata JSONB, -- Para guardar IDs relacionados (ej: reserva_id)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE AUDITORÍA (Logs)
CREATE TABLE IF NOT EXISTS auditoria (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES public.usuarios(id),
  accion TEXT NOT NULL,      -- Ej: 'crear_reserva', 'aprobar_reserva', 'editar_insumo'
  entidad TEXT NOT NULL,     -- Ej: 'reservas', 'insumos', 'usuarios'
  entidad_id uuid,
  detalles JSONB,            -- Antes/Después de los datos
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE configuraciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas para configuraciones_sistema
CREATE POLICY "Configuraciones visibles para todos" ON configuraciones_sistema FOR SELECT USING (true);
CREATE POLICY "Solo admin gestiona configuraciones" ON configuraciones_sistema FOR ALL USING (get_user_role(auth.uid()) = 'administrador');

-- Políticas para notificaciones
CREATE POLICY "Usuarios ven sus propias notificaciones" ON notificaciones FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Usuarios pueden marcar como leídas sus notificaciones" ON notificaciones FOR UPDATE USING (auth.uid() = usuario_id);
-- Permitir que el sistema (vía triggers o RPC) inserte notificaciones
CREATE POLICY "Sistema puede insertar notificaciones" ON notificaciones FOR INSERT WITH CHECK (true);

-- Políticas para auditoria
CREATE POLICY "Solo admin y supervisor ven auditoria" ON auditoria FOR SELECT USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
CREATE POLICY "Sistema puede insertar auditoria" ON auditoria FOR INSERT WITH CHECK (true);

-- ==========================================
-- REALTIME ENABLING
-- ==========================================
-- Nota: Esto usualmente se hace vía la UI de Supabase o comandos específicos de publicación.
-- Asegúrate de añadir las tablas al esquema 'supabase_realtime' si tienes acceso.
-- ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones, reservas, insumos;
