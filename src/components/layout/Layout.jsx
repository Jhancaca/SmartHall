/**
 * Layout.jsx
 * ─────────────────────────────────────────────────────────
 * Contenedor maestro de la interfaz autenticada.
 * 
 * Implementa un diseño de dos columnas:
 *  - Izquierda: Sidebar (fijo, navegación).
 *  - Derecha: Área principal que incluye el Header y la zona del
 *             contenido que cambia según la ruta (children).
 * 
 * Este patrón permite que el Sidebar y la estructura lateral no
 * se vuelvan a renderizar al navegar entre páginas, manteniendo
 * el estado y mejorando el rendimiento percivido.
 */

import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  return (
    <div style={styles.layout}>
      {/* Menú de navegación lateral */}
      <Sidebar />

      {/* Contenido Principal (Sidebar 240px + Margen) */}
      <div style={styles.main}>
        {/* Barra de herramientas superior */}
        <Header />

        {/* Zona de renderizado de la página actual */}
        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

// Estructura de rejilla principal para el layout
const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg)', // Fondo base del sistema (#F8FAFC)
  },
  main: {
    flex: 1,
    marginLeft: '240px', // Desplaza el contenido para no quedar debajo del sidebar fixed
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    padding: '0 2rem 2rem 2rem', // Espaciado cómodo para el contenido de las tarjetas
    flex: 1,
  }
};

export default Layout;
