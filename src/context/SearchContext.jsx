/**
 * SearchContext.jsx
 * ─────────────────────────────────────────────────────────
 * Contexto global de búsqueda unificada para SmartHall.
 * 
 * Proporciona un estado compartido de búsqueda global que permite:
 *  - Búsqueda transversal desde el Header (barra superior)
 *  - Navegación inteligente basada en palabras clave hacia módulos específicos
 *  - Sincronización del término de búsqueda entre componentes
 * 
 * El Header.jsx utiliza este contexto para:
 *  1. Capturar la entrada del usuario en el input de búsqueda
 *  2. Al presionar Enter, analizar palabras clave y navegar a la página correspondiente
 *     - Inventario: 'silla', 'mesa', 'luces', 'sonido', 'inventario', 'insumo', etc.
 *     - Usuarios: 'residente', 'usuario', 'perfil', 'apartamento', 'torre', 'personal'
 *     - Reservas: 'reserva', 'evento', 'fiesta', 'asamblea', 'reunion', 'fecha'
 *  3. Por defecto navega a /reservas si no hay coincidencia
 * 
 * Componentes consumidores: Header.jsx (productor/consumidor), cualquier página que necesite
 * reaccionar a búsquedas globales.
 * 
 * @module context/SearchContext
 */

import { createContext, useContext, useState } from 'react';

// Contexto interno para almacenar el estado de búsqueda global
const SearchContext = createContext();

/**
 * SearchProvider
 * ─────────────────────────────────────────────────────────
 * Componente proveedor que envuelve la aplicación y expone el estado de búsqueda.
 * 
 * @param {React.ReactNode} children - Componentes hijos que tendrán acceso al contexto
 * @returns {JSX.Element} Provider con value={globalQuery, setGlobalQuery}
 * 
 * Estado:
 *  - globalQuery: string - Término de búsqueda actual (inicialmente vacío)
 *  - setGlobalQuery: function - Setter para actualizar el término de búsqueda
 */
export const SearchProvider = ({ children }) => {
  // Estado del término de búsqueda global
  const [globalQuery, setGlobalQuery] = useState('');

  return (
    <SearchContext.Provider value={{ globalQuery, setGlobalQuery }}>
      {children}
    </SearchContext.Provider>
  );
};

/**
 * useSearch
 * ─────────────────────────────────────────────────────────
 * Hook personalizado para consumir el contexto de búsqueda global.
 * 
 * @returns {Object} { globalQuery: string, setGlobalQuery: Function }
 * @throws {Error} Si se usa fuera de un SearchProvider
 * 
 * Uso típico:
 *   const { globalQuery, setGlobalQuery } = useSearch();
 *   <input value={globalQuery} onChange={e => setGlobalQuery(e.target.value)} />
 */
export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch debe ser usado dentro de un SearchProvider');
  }
  return context;
};
