-- ==========================================
-- TABLA DE NOTIFICACIONES (Sincronizada con useNotifications.js)
-- ==========================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  leida BOOLEAN DEFAULT FALSE,
  vinculo VARCHAR(255), -- Ruta a la que redirigir al hacer clic (opcional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Usuarios ven sus propias notificaciones" ON notificaciones;
CREATE POLICY "Usuarios ven sus propias notificaciones" ON notificaciones
  FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Sistema puede insertar notificaciones" ON notificaciones;
CREATE POLICY "Sistema puede insertar notificaciones" ON notificaciones
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios marcan sus notificaciones como leídas" ON notificaciones;
CREATE POLICY "Usuarios marcan sus notificaciones como leídas" ON notificaciones
  FOR UPDATE USING (auth.uid() = usuario_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(usuario_id, leida);
