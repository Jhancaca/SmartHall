-- 1. Enumeradores
CREATE TYPE tipo_perfil AS ENUM ('administrador', 'residente', 'supervisor');
CREATE TYPE estado_usuario AS ENUM ('activo', 'inactivo');
CREATE TYPE estado_insumo AS ENUM ('disponible', 'en_uso', 'mantenimiento', 'dado_de_baja');
CREATE TYPE tipo_movimiento AS ENUM ('entrada', 'salida', 'ajuste', 'baja');
CREATE TYPE unidad_insumo AS ENUM ('unidad', 'caja', 'kg', 'litro', 'metro', 'par', 'set');

-- 2. Tablas Base
CREATE TABLE perfiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre tipo_perfil NOT NULL UNIQUE,
  descripcion TEXT
);

-- Insertar perfiles por defecto
INSERT INTO perfiles (nombre, descripcion) VALUES
('administrador', 'Acceso total al sistema'),
('supervisor', 'Gestión de inventario y reservas'),
('residente', 'Acceso de solo lectura al inventario y gestión de sus reservas');

-- 3. Tabla de Usuarios (Extiende auth.users)
CREATE TABLE usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id uuid REFERENCES perfiles(id),
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  numero_apto TEXT, -- Opcional, solo obligatorio para residentes
  telefono TEXT,
  estado estado_usuario DEFAULT 'activo',
  creado_por uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Categorías de Insumos
CREATE TABLE categorias_insumo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  icono TEXT, -- Nombre de un icono (ej. lucide-react)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar categorías por defecto
INSERT INTO categorias_insumo (nombre, descripcion, icono) VALUES
('Mobiliario', 'Sillas, mesas, etc.', 'car'),
('Audiovisual', 'Proyectores, micrófonos, sonido', 'monitor'),
('Menaje', 'Vasos, platos, cubiertos', 'coffee'),
('Iluminación', 'Luces, extensiones', 'lightbulb'),
('Limpieza', 'Escobas, traperos, detergentes', 'spray-can'),
('Decoración', 'Centros de mesa, manteles', 'image'),
('Otros', 'Insumos varios', 'box');

-- 5. Tabla de Insumos
CREATE TABLE insumos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id uuid REFERENCES categorias_insumo(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  unidad unidad_insumo DEFAULT 'unidad',
  cantidad_total INTEGER NOT NULL DEFAULT 0,
  cantidad_disponible INTEGER NOT NULL DEFAULT 0,
  cantidad_minima INTEGER NOT NULL DEFAULT 0,
  ubicacion TEXT,
  estado estado_insumo DEFAULT 'disponible',
  codigo_interno TEXT UNIQUE,
  imagen_url TEXT,
  creado_por uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Movimientos de Inventario (Kardex o historial)
CREATE TABLE movimientos_inventario (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id uuid REFERENCES insumos(id) ON DELETE CASCADE,
  tipo tipo_movimiento NOT NULL,
  cantidad INTEGER NOT NULL,
  cantidad_antes INTEGER NOT NULL,
  cantidad_despues INTEGER NOT NULL,
  motivo TEXT,
  registrado_por uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Funciones helper para las políticas
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS tipo_perfil AS $$
  SELECT p.nombre 
  FROM usuarios u
  JOIN perfiles p ON u.perfil_id = p.id
  WHERE u.id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;


-- Políticas para "perfiles"
-- Todos pueden ver perfiles (necesario para el login y mostrar badges)
CREATE POLICY "Perfiles son visibles para todos" ON perfiles FOR SELECT USING (true);


-- Políticas para "usuarios"
-- Un usuario puede verse a sí mismo
CREATE POLICY "Un usuario puede verse a sí mismo" ON usuarios FOR SELECT USING (auth.uid() = id);
-- Administrador puede ver, actualizar e insertar todos los usuarios
CREATE POLICY "Administradores pueden select en usuarios" ON usuarios FOR SELECT USING (get_user_role(auth.uid()) = 'administrador');
CREATE POLICY "Administradores pueden insert en usuarios" ON usuarios FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'administrador');
CREATE POLICY "Administradores pueden update en usuarios" ON usuarios FOR UPDATE USING (get_user_role(auth.uid()) = 'administrador');
CREATE POLICY "Administradores pueden delete en usuarios" ON usuarios FOR DELETE USING (get_user_role(auth.uid()) = 'administrador');


-- Políticas para "categorias_insumo"
-- Todos pueden ver categorías
CREATE POLICY "Todo usuario autenticado puede ver categorías" ON categorias_insumo FOR SELECT USING (auth.role() = 'authenticated');
-- Solo admin y supervisor pueden modificar categorías
CREATE POLICY "Admin/Supervisor pueden gestionar categorías" ON categorias_insumo 
  FOR ALL USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));


-- Políticas para "insumos"
-- Todos pueden ver los insumos
CREATE POLICY "Todo usuario autenticado puede ver insumos" ON insumos FOR SELECT USING (auth.role() = 'authenticated');
-- Solo administrador y supervisor pueden crear/modificar insumos
CREATE POLICY "Admin/Supervisor pueden insertar insumos" ON insumos FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
CREATE POLICY "Admin/Supervisor pueden actualizar insumos" ON insumos FOR UPDATE USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
CREATE POLICY "Administrador puede borrar insumos" ON insumos FOR DELETE USING (get_user_role(auth.uid()) = 'administrador');


-- Políticas para "movimientos_inventario"
-- Todos pueden ver movimientos (o solo roles seleccionados, temporalmente todos)
CREATE POLICY "Todo usuario autenticado puede ver movimientos" ON movimientos_inventario FOR SELECT USING (auth.role() = 'authenticated');
-- Solo admin y supervisor pueden registrar movimientos
CREATE POLICY "Admin/Supervisor pueden registrar movimientos" ON movimientos_inventario 
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));

-- Tarea: Puedes crear un trigger que automatice que crear un usuario acá cree en auth.users o manejarlo desde el cliente.
