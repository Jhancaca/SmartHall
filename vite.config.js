/**
 * vite.config.js
 * ─────────────────────────────────────────────────────────
 * Configuración optimizada de Vite para SmartHall.
 *
 * Mejoras aplicadas (skill: vite):
 *  - Alias `@` para imports limpios: `import X from '@/hooks/useX'`
 *  - Code-splitting manual por vendor chunks para cargas más rápidas.
 *  - Target ESNext para navegadores modernos.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor: React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Vendor: TanStack
          'vendor-tanstack': ['@tanstack/react-query', '@tanstack/react-table'],
          // Vendor: Recharts (pesado, cargado solo en Dashboard/Informes)
          'vendor-recharts': ['recharts'],
          // Vendor: Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
