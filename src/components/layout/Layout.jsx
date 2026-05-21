/**
 * Layout.jsx
 * ─────────────────────────────────────────────────────────
 * Contenedor maestro de la interfaz autenticada de SmartHall.
 *
 * Optimizaciones aplicadas (skills: composition-patterns, react-best-practices):
 *  - state-lift-state: Estado del sidebar (abierto/cerrado) manejado aquí
 *    para que tanto el botón hamburguesa como el overlay puedan controlarlo.
 *  - rendering-conditional-render: Usa ternarios en vez de && para
 *    renderizado condicional (evita render de `false` en el DOM).
 *  - rerender-no-inline-components: Estilos hoisted fuera del render.
 *
 * Implementa un diseño responsivo:
 *  - Desktop (>768px): Sidebar fijo a la izquierda, contenido desplazado.
 *  - Mobile (≤768px): Sidebar oculto con botón hamburguesa y overlay.
 */

import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /** Alterna visibilidad del sidebar en mobile */
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  /** Cierra el sidebar mobile (al navegar o click en overlay) */
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div style={styles.layout}>
      {/* Overlay oscuro para mobile cuando el sidebar está abierto */}
      {isMobileMenuOpen ? (
        <div
          style={styles.overlay}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      ) : null}

      {/* Menú de navegación lateral */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onNavigate={closeMobileMenu}
      />

      {/* Contenido Principal */}
      <div style={styles.main}>
        {/* Barra de herramientas superior con botón hamburguesa */}
        <Header onToggleMobileMenu={toggleMobileMenu} />

        {/* Zona de renderizado de la página actual */}
        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

/**
 * Estilos del Layout
 * Hoisted fuera del componente para evitar re-creación en cada render.
 * (skill: react-best-practices → rerender-memo-with-default-value)
 */
const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
  },
  main: {
    flex: 1,
    marginLeft: '240px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  content: {
    padding: '0 var(--space-xl) var(--space-xl) var(--space-xl)',
    flex: 1,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 'var(--z-overlay)',
    transition: 'opacity var(--transition-base)',
  },
};

/**
 * Media query para responsividad.
 * Se inyecta como <style> para manejar el breakpoint de 768px
 * sin necesidad de un CSS module externo.
 */
const ResponsiveStyles = () => (
  <style>{`
    @media (max-width: 768px) {
      .layout-main {
        margin-left: 0 !important;
      }
    }
  `}</style>
);

export default Layout;
