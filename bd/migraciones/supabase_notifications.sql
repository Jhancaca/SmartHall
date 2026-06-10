-- ==========================================
-- TABLA DE NOTIFICACIONES (Sincronizada con useNotifications.js)
-- ==========================================
-- Esta migración crea la tabla de notificaciones del sistema, diseñada
-- para funcionar en tiempo real con el hook useNotifications.js del frontend.
-- Permite enviar avisos a los usuarios sobre eventos importantes
-- (aprobación de reservas, préstamos, etc.).
--
-- CUÁNDO EJECUTAR: Después de que la tabla 'usuarios' haya sido creada.
-- ==========================================

-- ==========================================
-- TABLA: notificaciones
-- ==========================================
-- Almacena las notificaciones enviadas a los usuarios del sistema.
-- El frontend consulta esta tabla en tiempo real para mostrar la campana
-- de notificaciones con el contador de no leídas.
--
-- CAMPOS:
-- id: Identificador único de la notificación.
-- usuario_id: Referencia al usuario destinatario (se elimina en cascada).
-- titulo: Asunto breve de la notificación.
-- mensaje: Cuerpo del mensaje con los detalles.
-- tipo: Categoría visual para el frontend ('info', 'success', 'warning', 'error').
-- leida: Estado de lectura (false = no leída, true = leída).
-- vinculo: Ruta de navegación al hacer clic en la notificación (opcional).
-- created_at: Fecha y hora de creación de la notificación.
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

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Habilitar RLS para proteger las notificaciones a nivel de fila.
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- ==========================================
-- POLÍTICA: "Usuarios ven sus propias notificaciones"
-- ==========================================
-- Permisos: SELECT
-- Regla: Cada usuario solo puede ver las notificaciones dirigidas a él.
-- ==========================================
DROP POLICY IF EXISTS "Usuarios ven sus propias notificaciones" ON notificaciones;
CREATE POLICY "Usuarios ven sus propias notificaciones" ON notificaciones
  FOR SELECT USING (auth.uid() = usuario_id);

-- ==========================================
-- POLÍTICA: "Sistema puede insertar notificaciones"
-- ==========================================
-- Permisos: INSERT
-- Regla: El sistema puede insertar notificaciones para cualquier usuario.
-- Esto permite que triggers, funciones RPC y el backend envíen notificaciones.
-- ==========================================
DROP POLICY IF EXISTS "Sistema puede insertar notificaciones" ON notificaciones;
CREATE POLICY "Sistema puede insertar notificaciones" ON notificaciones
  FOR INSERT WITH CHECK (true);

-- ==========================================
-- POLÍTICA: "Usuarios marcan sus notificaciones como leídas"
-- ==========================================
-- Permisos: UPDATE
-- Regla: Cada usuario puede actualizar (marcar como leída) sus propias notificaciones.
-- ==========================================
DROP POLICY IF EXISTS "Usuarios marcan sus notificaciones como leídas" ON notificaciones;
CREATE POLICY "Usuarios marcan sus notificaciones como leídas" ON notificaciones
  FOR UPDATE USING (auth.uid() = usuario_id);

-- ==========================================
-- ÍNDICES DE RENDIMIENTO
-- ==========================================
-- Índice para buscar notificaciones por usuario (consulta principal del frontend)
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);

-- Índice compuesto para contar notificaciones no leídas por usuario
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(usuario_id, leida);
