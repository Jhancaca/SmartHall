import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env to get Supabase credentials
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const defaults = [
    { categoria: 'bodega_insumo', clave: 'bodega_principal', valor: 'Bodega Principal', orden: 1 },
    { categoria: 'bodega_insumo', clave: 'bodega_auxiliar', valor: 'Bodega Auxiliar', orden: 2 },
    { categoria: 'bodega_insumo', clave: 'bodega_parqueadero', valor: 'Bodega Parqueadero', orden: 3 }
  ];

  console.log('Inserting default bodegas...');
  const { data, error } = await supabase.from('configuraciones_sistema').insert(defaults);
  
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Inserted successfully!');
  }
}

seed();
