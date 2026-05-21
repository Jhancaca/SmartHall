/**
 * main.jsx
 * ─────────────────────────────────────────────────────────
 * Punto de entrada principal de la aplicación React.
 * Se encarga de:
 *  1. Montar el árbol de componentes en el elemento #root del index.html.
 *  2. Envolver toda la aplicación dentro del <AuthProvider> para que
 *     cualquier componente hijo pueda acceder al contexto de autenticación.
 *  3. Importar los estilos globales (index.css).
 *
 * Orden de envoltura:
 *  React.StrictMode → detecta problemas de desarrollo (doble renderizado, etc.)
 *  AuthProvider     → provee la sesión de Supabase a toda la app
 *  App              → enrutador principal
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { SearchProvider } from './context/SearchContext.jsx'
import { UIFeedbackProvider } from './context/UIFeedbackContext.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Crear una instancia de QueryClient para TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Desactivar re-petición al enfocar ventana para ahorrar API calls
      staleTime: 5 * 60 * 1000,    // 5 minutos de validez de datos en caché
    },
  },
})

// Monta la aplicación en el nodo #root definido en index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* QueryClientProvider provee el cliente de caching de TanStack Query */}
    <QueryClientProvider client={queryClient}>
      {/* AuthProvider: hace disponible el estado de sesión globalmente */}
      <AuthProvider>
        <UIFeedbackProvider>
          <SearchProvider>
            <App />
          </SearchProvider>
        </UIFeedbackProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
