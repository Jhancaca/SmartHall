/**
 * Sidebar.jsx
 * ─────────────────────────────────────────────────────────
 * Menú de navegación lateral fijo de SmartHall.
 *
 * Optimizaciones aplicadas (skills: composition-patterns, react-best-practices):
 *  - Responsive: Se oculta en ≤768px y se muestra con animación slide-in
 *    cuando isMobileOpen es true (controlado desde Layout).
 *  - rerender-no-inline-components: Estilos hoisted fuera del render.
 *  - Accesibilidad: aria-label en la navegación, role="navigation".
 *
 * @param {boolean}  isMobileOpen - Si el sidebar mobile está abierto
 * @param {Function} onNavigate   - Callback al navegar (cierra sidebar mobile)
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Calendar,
  Building2,
  CheckCircle,
  RotateCcw,
  FileText,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isMobileOpen = false, onNavigate }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === 'administrador';
  const isSupervisor = profile?.rol === 'supervisor';

  /**
   * Configuración dinámica de ítems del menú según rol.
   * Cada ítem define: nombre visible, ruta, ícono y opcionalmente roles.
   */
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Reservas', path: '/reservas', icon: Calendar },
    { name: 'Calendario', path: '/reservas/calendario', icon: Calendar },
  ];

  // Si es admin o supervisor, ve módulos administrativos
  if (isAdmin || isSupervisor) {
    menuItems.push({ name: 'Inventario', path: '/inventario', icon: Package });
    menuItems.push({ name: 'Aprobaciones', path: '/admin/aprobaciones', icon: CheckCircle });
    menuItems.push({ name: 'Préstamos', path: '/admin/prestamos', icon: RotateCcw });
    menuItems.push({ name: 'Control Acceso', path: '/admin/acceso', icon: ShieldCheck });
    menuItems.push({ name: 'Informes', path: '/admin/informes', icon: FileText });
    menuItems.push({ name: 'Auditoría', path: '/admin/auditoria', icon: ClipboardList });
  } else {
    // Residente ve catálogo e invitados
    menuItems.push({ name: 'Catálogo', path: '/insumos', icon: Package });
    menuItems.push({ name: 'Invitados', path: '/reservas/invitados', icon: Users });
  }

  // Opciones exclusivas de administrador
  if (isAdmin) {
    menuItems.push({ name: 'Usuarios', path: '/usuarios', icon: Users });
    menuItems.push({ name: 'Configuración', path: '/configuracion', icon: Settings });
  }

  /** Handler de click en enlace — cierra sidebar mobile */
  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <>
      {/* Inyectar estilos responsive una sola vez */}
      <style>{sidebarCSS}</style>

      <aside
        className={`sh-sidebar ${isMobileOpen ? 'sh-sidebar--open' : ''}`}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* ── Branding / Logo ── */}
        <div style={styles.logoContainer}>
          <div style={styles.logoSquare}>
            <Building2 color="white" size={20} />
          </div>
          <div style={styles.branding}>
            <h1 style={styles.brandName}>SmartHall</h1>
            <p style={styles.brandSub}>Software Residencial</p>
          </div>
        </div>

        {/* ── Navegación Principal ── */}
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={handleNavClick}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              {({ isActive }) => (
                <>
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

        {/* ── Footer del Sidebar ── */}
        <div style={styles.footer}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v2.0.0</p>
        </div>
      </aside>
    </>
  );
};

/**
 * CSS responsive del Sidebar inyectado vía template literal.
 * Desktop: fijo a 240px.
 * Mobile (≤768px): fuera de pantalla, se desliza con transición.
 */
const sidebarCSS = `
  .sh-sidebar {
    width: 240px;
    background-color: var(--white);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: fixed;
    left: 0;
    top: 0;
    z-index: var(--z-sticky);
    transition: transform var(--transition-slow);
  }

  @media (max-width: 768px) {
    .sh-sidebar {
      transform: translateX(-100%);
      z-index: calc(var(--z-overlay) + 1);
      box-shadow: var(--shadow-xl);
    }
    .sh-sidebar.sh-sidebar--open {
      transform: translateX(0);
    }
  }
`;

/** Estilos JavaScript hoisted del Sidebar */
const styles = {
  logoContainer: {
    padding: 'var(--space-xl) var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoSquare: {
    backgroundColor: 'var(--primary)',
    borderRadius: 'var(--radius-md)',
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
    fontSize: 'var(--font-size-xl)',
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
    textTransform: 'uppercase',
  },
  nav: {
    padding: '0 var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
    flex: 1,
    overflowY: 'auto',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    transition: 'all var(--transition-fast)',
    fontSize: 'var(--font-size-sm)',
  },
  navLinkActive: {
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
  },
  footer: {
    padding: 'var(--space-lg)',
    borderTop: '1px solid var(--border-light)',
    textAlign: 'center',
  },
};

export default Sidebar;
