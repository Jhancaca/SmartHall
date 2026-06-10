/**
 * check_fk.js
 * ─────────────────────────────────────────────────────────
 * Script de utilidad para verificar las llaves foráneas (Foreign Keys) en la
 * base de datos de Supabase de SmartHall.
 *
 * Propósito:
 *  - Ejecuta la función RPC 'get_foreign_keys' definida en la base de datos.
 *  - Muestra en consola la lista de llaves foráneas y posibles errores.
 *  - Se usa para diagnóstico y verificación de integridad referencial.
 *
 * Uso:
 *  node check_fk.js
 *
 * Requiere: Archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
 * NOTA: Este script se ejecuta en Node.js, no en el navegador.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Leer archivo .env para obtener credenciales de Supabase
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parsear variables de entorno manualmente (formato KEY=VALUE)
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

// Crear cliente de Supabase con las credenciales del .env
const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * checkFK
 * Ejecuta la función RPC 'get_foreign_keys' en Supabase y muestra el resultado.
 * Esta función debe estar definida en la base de datos para listar las FK activas.
 */
async function checkFK() {
  const { data, error } = await supabase.rpc('get_foreign_keys');
  console.log(data, error);
}
checkFK();
