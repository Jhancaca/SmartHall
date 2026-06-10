/**
 * seed_bodegas.js
 * ─────────────────────────────────────────────────────────
 * Script de semilla (seed) para insertar las bodegas predeterminadas de SmartHall
 * en la tabla 'configuraciones_sistema' de Supabase.
 *
 * Propósito:
 *  - Inicializar las ubicaciones de almacenamiento (bodegas) del sistema.
 *  - Se ejecuta una sola vez durante la configuración inicial de la base de datos.
 *
 * Bodegas predeterminadas:
 *  1. Bodega Principal - Ubicación principal de almacenamiento.
 *  2. Bodega Auxiliar - Ubicación secundaria de almacenamiento.
 *  3. Bodega Parqueadero - Ubicación en el área de parqueadero.
 *
 * Uso:
 *  node seed_bodegas.js
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
 * seed
 * Inserta las 3 bodegas predeterminadas en la tabla 'configuraciones_sistema'.
 * Cada bodega tiene una categoría 'bodega_insumo', una clave única, un valor
 * legible y un orden para la visualización en la interfaz.
 */
async function seed() {
  // Array de configuraciones de bodegas a insertar
  const defaults = [
    { categoria: 'bodega_insumo', clave: 'bodega_principal', valor: 'Bodega Principal', orden: 1 },
    { categoria: 'bodega_insumo', clave: 'bodega_auxiliar', valor: 'Bodega Auxiliar', orden: 2 },
    { categoria: 'bodega_insumo', clave: 'bodega_parqueadero', valor: 'Bodega Parqueadero', orden: 3 }
  ];

  console.log('Inserting default bodegas...');
  // Insertar en la tabla configuraciones_sistema
  const { data, error } = await supabase.from('configuraciones_sistema').insert(defaults);
  
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Inserted successfully!');
  }
}

seed();
