/**
 * Sidebar.jsx
 * ─────────────────────────────────────────────────────────
 * Menú de navegación lateral fijo de SmartHall.
 * 
 * Este componente:
 *  1. Muestra el logo y branding del sistema.
 *  2. Genera dinámicamente el menú de navegación basado en el rol del usuario.
 *  3. Resalta el ítem activo mediante NavLink de react-router-dom.
 *  4. Se mantiene fijo a la izquierda (240px de ancho) en toda la aplicación protegida.
 */

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Settings, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { profile } = useAuth();
  
  // Verificación de roles para mostrar u ocultar opciones
  const isAdmin = profile?.rol === 'administrador';

  // Configuración de los ítems del menú
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Reservas', path: '/reservas', icon: Calendar },
    { name: 'Inventario', path: '/inventario', icon: Package },
  ];

  // Añadir opciones exclusivas de administrador
  if (isAdmin) {
    menuItems.push({ name: 'Usuarios', path: '/usuarios', icon: Users });
    menuItems.push({ name: 'Configuración', path: '/configuracion', icon: Settings });
  }

  return (
    <aside style={styles.sidebar}>
      {/* Branding / Logo Section */}
      <div style={styles.logoContainer}>
        <div style={styles.logoSquare}>
          <Building2 color="white" size={20} />
        </div>
        <div style={styles.branding}>
          <h1 style={styles.brandName}>SmartHall</h1>
          <p style={styles.brandSub}>RESIDENTIAL CONCIERGE</p>
        </div>
      </div>

      {/* Navegación Principal */}
      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            {({ isActive }) => (
              <>
                {/* El ícono cambia de color si está activo */}
                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  color={isActive ? 'var(--primary)' : 'var(--text-muted)'} 
                />
                <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer del Sidebar (Versión o info adicional) */}
      <div style={styles.footer}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v1.0.0 (Entrega 1)</p>
      </div>
    </aside>
  );
};

// Estilos específicos para el Sidebar
const styles = {
  sidebar: {
    width: '240px',
    backgroundColor: 'var(--white)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 10,
  },
  logoContainer: {
    padding: '2rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoSquare: {
    backgroundColor: 'var(--primary)',
    borderRadius: '10px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
  },
  branding: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandName: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  brandSub: {
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    fontWeight: 700,
    marginTop: '2px',
    letterSpacing: '0.05em',
  },
  nav: {
    padding: '0 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: 'var(--text-muted)',
    transition: 'all 0.2s ease',
    fontSize: '0.875rem',
  },
  navLinkActive: {
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
  },
  footer: {
    padding: '1.5rem',
    borderTop: '1px solid #F1F5F9',
    textAlign: 'center'
  }
};

export default Sidebar;
