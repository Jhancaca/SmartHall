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

// Monta la aplicación en el nodo #root definido en index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* AuthProvider: hace disponible el estado de sesión globalmente */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
