/**
 * supabase.js
 * ─────────────────────────────────────────────────────────
 * Configura y exporta el cliente de Supabase para toda la aplicación.
 *
 * Supabase es la capa de backend que provee:
 *  - Base de datos PostgreSQL
 *  - Autenticación de usuarios (Auth)
 *  - Row Level Security (RLS) para control de acceso
 *
 * Las credenciales (URL y clave anónima) se leen de las variables de
 * entorno definidas en el archivo .env de la raíz del proyecto.
 * Vite expone estas variables con el prefijo VITE_.
 *
 * IMPORTANTE: Nunca escribas las credenciales directamente aquí.
 * Siempre usa el archivo .env y asegúrate de que esté en .gitignore.
 *
 */

import { createClient } from '@supabase/supabase-js';

// Lee la URL del proyecto de Supabase desde las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Lee la clave anónima (pública) de Supabase desde las variables de entorno
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Advertencia en consola si faltan las variables de entorno al iniciar
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Faltan configurar las variables de entorno de Supabase en .env');
}

/**
 * supabase
 * Cliente principal de Supabase. Se exporta y se reutiliza en todos los
 * hooks y contextos que necesiten interactuar con la base de datos o auth.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
