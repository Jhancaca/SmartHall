-- ==========================================
-- SCHEMA BASE - SMARTHALL
-- ==========================================
-- Esta migración crea el esquema base del sistema SmartHall, incluyendo:
-- 1. Enumeradores para tipos de perfil, estado de usuario, estado de insumo, etc.
-- 2. Tablas base: perfiles, usuarios, categorías de insumos, insumos y movimientos.
-- 3. Función helper get_user_role() para las políticas RLS.
-- 4. Row Level Security (RLS) habilitado en todas las tablas.
-- 5. Políticas de seguridad por rol para cada tabla.
--
-- CUÁNDO EJECUTAR: Esta es la migración inicial. Debe ejecutarse primero
-- antes que cualquier otra migración del sistema.
-- ==========================================

-- ==========================================
-- 1. ENUMERADORES
-- ==========================================
-- Definen los conjuntos de valores permitidos para las columnas de tipo ENUM.

-- tipo_perfil: Roles disponibles en el sistema
-- 'administrador': Acceso total al sistema
-- 'supervisor': Gestión de inventario y reservas (personal de portería)
-- 'residente': Acceso de solo lectura al inventario y gestión de sus propias reservas
CREATE TYPE tipo_perfil AS ENUM ('administrador', 'residente', 'supervisor');

-- estado_usuario: Estado de la cuenta de usuario
-- 'activo': La cuenta está habilitada
-- 'inactivo': La cuenta está deshabilitada
CREATE TYPE estado_usuario AS ENUM ('activo', 'inactivo');

-- estado_insumo: Estado actual de un insumo en el inventario
-- 'disponible': El insumo está disponible para préstamo
-- 'en_uso': El insumo está actualmente prestado para un evento
-- 'mantenimiento': El insumo está en reparación o mantenimiento
-- 'dado_de_baja': El insumo fue retirado permanentemente del inventario
CREATE TYPE estado_insumo AS ENUM ('disponible', 'en_uso', 'mantenimiento', 'dado_de_baja');

-- tipo_movimiento: Tipo de movimiento registrado en el inventario
-- 'entrada': Se agregaron unidades al inventario
-- 'salida': Se retiraron unidades del inventario (préstamo)
-- 'ajuste': Corrección manual del stock
-- 'baja': Insumo dado de baja permanentemente
CREATE TYPE tipo_movimiento AS ENUM ('entrada', 'salida', 'ajuste', 'baja');

-- unidad_insumo: Unidad de medida de los insumos
-- 'unidad': Pieza individual
-- 'caja': Caja con múltiples unidades
-- 'kg': Kilogramo
-- 'litro': Litro
-- 'metro': Metro lineal
-- 'par': Par (2 unidades)
-- 'set': Juego o conjunto
CREATE TYPE unidad_insumo AS ENUM ('unidad', 'caja', 'kg', 'litro', 'metro', 'par', 'set');

-- ==========================================
-- 2. TABLA: perfiles
-- ==========================================
-- Almacena los perfiles (roles) disponibles en el sistema.
-- Es una tabla de referencia que se utiliza para asignar permisos a los usuarios.
--
-- CAMPOS:
-- id: Identificador único del perfil.
-- nombre: Nombre único del perfil (ej: 'administrador', 'residente').
-- descripcion: Descripción del perfil y sus permisos.
-- ==========================================
CREATE TABLE perfiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre tipo_perfil NOT NULL UNIQUE,
  descripcion TEXT
);

-- ==========================================
-- INSERT: Perfiles por defecto
-- ==========================================
-- Inserta los tres perfiles base del sistema.
-- Estos son los roles que pueden ser asignados a los usuarios.
-- ==========================================
INSERT INTO perfiles (nombre, descripcion) VALUES
('administrador', 'Acceso total al sistema'),
('supervisor', 'Gestión de inventario y reservas'),
('residente', 'Acceso de solo lectura al inventario y gestión de sus reservas');

-- ==========================================
-- 3. TABLA: usuarios
-- ==========================================
-- Almacena los datos de perfil de los usuarios del sistema.
-- Extiende la tabla auth.users de Supabase con información adicional.
-- La autenticación se maneja por Supabase Auth; esta tabla almacena
-- los datos de negocio del usuario.
--
-- CAMPOS:
-- id: Identificador único (referencia a auth.users, se elimina en cascada).
-- perfil_id: Referencia al perfil/rol asignado al usuario.
-- nombres: Nombres del usuario.
-- apellidos: Apellidos del usuario.
-- email: Correo electrónico único del usuario.
-- numero_apto: Número de apartamento (solo obligatorio para residentes).
-- telefono: Número de teléfono de contacto.
-- estado: Estado de la cuenta ('activo' o 'inactivo').
-- creado_por: Referencia al usuario que creó este registro.
-- created_at: Fecha y hora de creación del registro.
-- updated_at: Fecha y hora de la última actualización.
-- ==========================================
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

-- ==========================================
-- 4. TABLA: categorias_insumo
-- ==========================================
-- Almacena las categorías de insumos del inventario del salón.
-- Permite organizar los insumos en grupos lógicos para facilitar
-- la búsqueda y gestión.
--
-- CAMPOS:
-- id: Identificador único de la categoría.
-- nombre: Nombre único de la categoría (ej: 'Mobiliario', 'Audiovisual').
-- descripcion: Descripción de la categoría.
-- icono: Nombre del icono para el frontend (ej: lucide-react icons).
-- created_at: Fecha y hora de creación del registro.
-- ==========================================
CREATE TABLE categorias_insumo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  icono TEXT, -- Nombre de un icono (ej. lucide-react)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INSERT: Categorías por defecto
-- ==========================================
-- Inserta las categorías iniciales de insumos para el salón social.
-- Estas categorías cubren los tipos más comunes de insumos de un salón de eventos.
-- ==========================================
INSERT INTO categorias_insumo (nombre, descripcion, icono) VALUES
('Mobiliario', 'Sillas, mesas, etc.', 'car'),
('Audiovisual', 'Proyectores, micrófonos, sonido', 'monitor'),
('Menaje', 'Vasos, platos, cubiertos', 'coffee'),
('Iluminación', 'Luces, extensiones', 'lightbulb'),
('Limpieza', 'Escobas, traperos, detergentes', 'spray-can'),
('Decoración', 'Centros de mesa, manteles', 'image'),
('Otros', 'Insumos varios', 'box');

-- ==========================================
-- 5. TABLA: insumos
-- ==========================================
-- Almacena los insumos disponibles en el inventario del salón social.
-- Cada insumo pertenece a una categoría y tiene un control de stock.
-- Los residentes pueden ver los insumos; solo admin/supervisor pueden gestionarlos.
--
-- CAMPOS:
-- id: Identificador único del insumo.
-- categoria_id: Referencia a la categoría a la que pertenece.
-- nombre: Nombre del insumo.
-- descripcion: Descripción detallada del insumo.
-- unidad: Unidad de medida (unidad, caja, kg, litro, etc.).
-- cantidad_total: Stock total del insumo.
-- cantidad_disponible: Stock disponible para préstamo.
-- cantidad_minima: Stock mínimo de alerta (para reposición).
-- ubicacion: Ubicación física del insumo en el salón.
-- estado: Estado actual del insumo (disponible, en_uso, mantenimiento, dado_de_baja).
-- codigo_interno: Código único de identificación interna.
-- imagen_url: URL de la imagen del insumo.
-- creado_por: Referencia al usuario que registró el insumo.
-- created_at: Fecha y hora de creación del registro.
-- updated_at: Fecha y hora de la última actualización.
-- ==========================================
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

-- ==========================================
-- 6. TABLA: movimientos_inventario
-- ==========================================
-- Registra el historial de todos los movimientos de stock de los insumos
-- (kardex). Permite rastrear entradas, salidas, ajustes y bajas de cada
-- insumo con su motivo y responsable.
--
-- CAMPOS:
-- id: Identificador único del movimiento.
-- insumo_id: Referencia al insumo afectado (se elimina en cascada).
-- tipo: Tipo de movimiento (entrada, salida, ajuste, baja).
-- cantidad: Cantidad de unidades movidas.
-- cantidad_antes: Stock del insumo antes del movimiento.
-- cantidad_despues: Stock del insumo después del movimiento.
-- motivo: Descripción del motivo del movimiento.
-- registrado_por: Referencia al usuario que registró el movimiento.
-- created_at: Fecha y hora del movimiento.
-- ==========================================
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
-- Habilitar RLS en todas las tablas para proteger los datos a nivel de fila.
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- FUNCIÓN HELPER: get_user_role
-- ==========================================
-- Retorna el nombre del perfil (rol) de un usuario dado su ID.
-- Se utiliza en todas las políticas RLS para verificar permisos por rol.
--
-- Parámetros:
-- user_id: UUID del usuario a consultar.
--
-- Retorna: tipo_perfil ('administrador', 'residente', 'supervisor').
-- Se ejecuta con SECURITY DEFINER para que pueda acceder a la tabla usuarios.
-- ==========================================
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS tipo_perfil AS $$
  SELECT p.nombre 
  FROM usuarios u
  JOIN perfiles p ON u.perfil_id = p.id
  WHERE u.id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;


-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- ==========================================
-- POLÍTICAS PARA: perfiles
-- ==========================================
-- Todos los usuarios autenticados pueden ver los perfiles (necesario para
-- el login y mostrar badges de rol en la interfaz).
-- ==========================================
CREATE POLICY "Perfiles son visibles para todos" ON perfiles FOR SELECT USING (true);


-- ==========================================
-- POLÍTICAS PARA: usuarios
-- ==========================================
-- Un usuario puede verse a sí mismo (su propio perfil).
-- El administrador tiene acceso completo: puede ver, insertar, actualizar
-- y eliminar cualquier usuario del sistema.
-- ==========================================
CREATE POLICY "Un usuario puede verse a sí mismo" ON usuarios FOR SELECT USING (auth.uid() = id);
-- Administrador puede ver, actualizar e insertar todos los usuarios
CREATE POLICY "Administradores pueden select en usuarios" ON usuarios FOR SELECT USING (get_user_role(auth.uid()) = 'administrador');
CREATE POLICY "Administradores pueden insert en usuarios" ON usuarios FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'administrador');
CREATE POLICY "Administradores pueden update en usuarios" ON usuarios FOR UPDATE USING (get_user_role(auth.uid()) = 'administrador');
CREATE POLICY "Administradores pueden delete en usuarios" ON usuarios FOR DELETE USING (get_user_role(auth.uid()) = 'administrador');


-- ==========================================
-- POLÍTICAS PARA: categorias_insumo
-- ==========================================
-- Todos los usuarios autenticados pueden ver las categorías (para filtrar insumos).
-- Solo administrador y supervisor pueden crear, modificar o eliminar categorías.
-- ==========================================
CREATE POLICY "Todo usuario autenticado puede ver categorías" ON categorias_insumo FOR SELECT USING (auth.role() = 'authenticated');
-- Solo admin y supervisor pueden modificar categorías
CREATE POLICY "Admin/Supervisor pueden gestionar categorías" ON categorias_insumo 
  FOR ALL USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));


-- ==========================================
-- POLÍTICAS PARA: insumos
-- ==========================================
-- Todos los usuarios autenticados pueden ver los insumos (consulta de inventario).
-- Solo administrador y supervisor pueden crear y actualizar insumos.
-- Solo el administrador puede eliminar insumos del sistema.
-- ==========================================
CREATE POLICY "Todo usuario autenticado puede ver insumos" ON insumos FOR SELECT USING (auth.role() = 'authenticated');
-- Solo administrador y supervisor pueden crear/modificar insumos
CREATE POLICY "Admin/Supervisor pueden insertar insumos" ON insumos FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
CREATE POLICY "Admin/Supervisor pueden actualizar insumos" ON insumos FOR UPDATE USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
CREATE POLICY "Administrador puede borrar insumos" ON insumos FOR DELETE USING (get_user_role(auth.uid()) = 'administrador');


-- ==========================================
-- POLÍTICAS PARA: movimientos_inventario
-- ==========================================
-- Todos los usuarios autenticados pueden ver los movimientos (historial transparente).
-- Solo administrador y supervisor pueden registrar nuevos movimientos de inventario.
-- ==========================================
CREATE POLICY "Todo usuario autenticado puede ver movimientos" ON movimientos_inventario FOR SELECT USING (auth.role() = 'authenticated');
-- Solo admin y supervisor pueden registrar movimientos
CREATE POLICY "Admin/Supervisor pueden registrar movimientos" ON movimientos_inventario 
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));

-- Tarea: Puedes crear un trigger que automatice que crear un usuario acá cree en auth.users o manejarlo desde el cliente.
