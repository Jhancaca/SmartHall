-- ==========================================
-- MEJORAS SMARTHALL - ENTREGA 3
-- ==========================================
-- Esta migración agrega tres tablas fundamentales para la tercera entrega
-- del sistema SmartHall:
-- 1. Configuraciones del sistema: Listas desplegables dinámicas.
-- 2. Notificaciones: Sistema de avisos para los usuarios.
-- 3. Auditoría: Registro de acciones para trazabilidad.
--
-- También habilita Row Level Security (RLS) en las tres tablas y crea
-- las políticas de acceso correspondientes por rol.
--
-- CUÁNDO EJECUTAR: Después de que las tablas base (usuarios, perfiles)
-- hayan sido creadas y la función get_user_role esté disponible.
-- ==========================================

-- ==========================================
-- TABLA: configuraciones_sistema
-- ==========================================
-- Almacena las listas desplegables dinámicas del sistema (select lists).
-- Permite al administrador gestionar las opciones sin modificar código.
-- Cada configuración tiene una categoría (ej: 'tipo_evento'), una clave
-- interna y un valor visible para el usuario.
--
-- CAMPOS:
-- id: Identificador único de la configuración.
-- categoria: Grupo al que pertenece la configuración (ej: 'tipo_evento').
-- clave: Valor interno utilizado en el código (ej: 'social').
-- valor: Texto visible para el usuario (ej: 'Evento Social').
-- orden: Orden de aparición en las listas desplegables.
-- activo: Indica si la opción está habilitada (true) o deshabilitada (false).
-- created_at: Fecha y hora de creación del registro.
-- ==========================================
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

-- ==========================================
-- INSERT: Valores iniciales para Tipos de Evento
-- ==========================================
-- Inserta las opciones predeterminadas para el selector de tipo de evento.
-- ON CONFLICT DO NOTHING evita duplicados si la migración se ejecuta varias veces.
-- ==========================================
INSERT INTO configuraciones_sistema (categoria, clave, valor, orden) VALUES
('tipo_evento', 'fiesta_infantil', 'Fiesta Infantil', 1),
('tipo_evento', 'reunion_social', 'Reunión Social', 2),
('tipo_evento', 'asamblea', 'Asamblea de Copropietarios', 3),
('tipo_evento', 'otro', 'Otro', 4)
ON CONFLICT DO NOTHING;

-- ==========================================
-- TABLA: notificaciones
-- ==========================================
-- Almacena las notificaciones enviadas a los usuarios del sistema.
-- El frontend (useNotifications.js) consulta esta tabla en tiempo real
-- para mostrar la campana de notificaciones.
--
-- CAMPOS:
-- id: Identificador único de la notificación.
-- usuario_id: Referencia al usuario que recibe la notificación.
-- titulo: Asunto o título breve de la notificación.
-- mensaje: Cuerpo del mensaje de la notificación.
-- tipo: Categoría visual ('info', 'success', 'warning', 'error').
-- leida: Indica si el usuario ya leyó la notificación (false por defecto).
-- metadata: Datos adicionales en formato JSON (ej: reserva_id relacionado).
-- created_at: Fecha y hora de creación de la notificación.
-- ==========================================
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

-- ==========================================
-- TABLA: auditoria
-- ==========================================
-- Registra todas las acciones importantes realizadas en el sistema para
-- trazabilidad y cumplimiento normativo. Permite reconstruir quién hizo
-- qué cambio, cuándo y desde dónde.
--
-- CAMPOS:
-- id: Identificador único del registro de auditoría.
-- usuario_id: Referencia al usuario que realizó la acción (NULL si es sistema).
-- accion: Nombre de la acción realizada (ej: 'crear_reserva', 'aprobar_reserva').
-- entidad: Tabla o entidad afectada (ej: 'reservas', 'insumos', 'usuarios').
-- entidad_id: ID del registro afectado en la entidad.
-- detalles: JSON con los datos antes/después del cambio.
-- ip_address: Dirección IP desde la que se realizó la acción.
-- created_at: Fecha y hora de la acción.
-- ==========================================
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
-- Habilitar RLS en las tres tablas para proteger los datos a nivel de fila.
ALTER TABLE configuraciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- ==========================================
-- POLÍTICAS PARA: configuraciones_sistema
-- ==========================================
-- Todos los usuarios autenticados pueden ver las configuraciones (para cargar select lists).
-- Solo el administrador puede crear, modificar o eliminar configuraciones.
-- ==========================================
CREATE POLICY "Configuraciones visibles para todos" ON configuraciones_sistema FOR SELECT USING (true);
CREATE POLICY "Solo admin gestiona configuraciones" ON configuraciones_sistema FOR ALL USING (get_user_role(auth.uid()) = 'administrador');

-- ==========================================
-- POLÍTICAS PARA: notificaciones
-- ==========================================
-- Cada usuario solo puede ver sus propias notificaciones.
-- Cada usuario puede marcar como leídas sus propias notificaciones.
-- El sistema (triggers, funciones RPC) puede insertar notificaciones para cualquier usuario.
-- ==========================================
CREATE POLICY "Usuarios ven sus propias notificaciones" ON notificaciones FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Usuarios pueden marcar como leídas sus notificaciones" ON notificaciones FOR UPDATE USING (auth.uid() = usuario_id);
-- Permitir que el sistema (vía triggers o RPC) inserte notificaciones
CREATE POLICY "Sistema puede insertar notificaciones" ON notificaciones FOR INSERT WITH CHECK (true);

-- ==========================================
-- POLÍTICAS PARA: auditoria
-- ==========================================
-- Solo administrador y supervisor pueden consultar los registros de auditoría.
-- El sistema puede insertar registros de auditoría desde cualquier parte del código.
-- ==========================================
CREATE POLICY "Solo admin y supervisor ven auditoria" ON auditoria FOR SELECT USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
CREATE POLICY "Sistema puede insertar auditoria" ON auditoria FOR INSERT WITH CHECK (true);

-- ==========================================
-- REALTIME ENABLING
-- ==========================================
-- Nota: Esto usualmente se hace vía la UI de Supabase o comandos específicos de publicación.
-- Asegúrate de añadir las tablas al esquema 'supabase_realtime' si tienes acceso.
-- ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones, reservas, insumos;
