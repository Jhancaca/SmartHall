/**
 * Header.jsx
 * ─────────────────────────────────────────────────────────
 * Barra superior (Cabecera) de la aplicación protegida.
 * 
 * Se encarga de:
 *  1. Mostrar herramientas de búsqueda rápida (placeholder).
 *  2. Mostrar notificaciones e iconos de ayuda.
 *  3. Identificar al usuario actualmente logueado (Nombre, Rol y Apto).
 *  4. Proveer el acceso directo al cierre de sesión (signOut).
 */

import { LogOut, Bell, HelpCircle, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { profile, signOut } = useAuth();

  return (
    <header style={styles.header}>
      {/* Sección de Búsqueda */}
      <div style={styles.searchContainer}>
        <div style={styles.searchWrapper}>
          <SearchIcon size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar residentes, insumos o reservas..." 
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Sección de Acciones y Usuario */}
      <div style={styles.actionsContainer}>
        {/* Iconos de utilidad */}
        <button style={styles.iconButton} title="Notificaciones">
          <Bell size={20} />
          {/* Indicador de notificación */}
          <span style={styles.notifBadge}></span>
        </button>
        <button style={styles.iconButton} title="Preguntas frecuentes">
          <HelpCircle size={20} />
        </button>

        <div style={styles.divider}></div>

        {/* Información resumida del Perfil */}
        <div style={styles.profileInfo}>
          <span style={styles.profileName}>
            {profile?.nombres} {profile?.apellidos}
          </span>
          <span style={styles.profileRole}>
            {profile?.rol} {profile?.numero_apto ? `• Apto ${profile.numero_apto}` : ''}
          </span>
        </div>

        {/* Cierre de sesión */}
        <button onClick={signOut} style={styles.logoutButton} title="Cerrar sesión de SmartHall">
          <LogOut size={18} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Salir</span>
        </button>
      </div>
    </header>
  );
};

// Estilos aplicados dinámicamente al Header
const styles = {
  header: {
    height: '80px',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
  },
  searchContainer: {
    flex: 1,
    maxWidth: '450px',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'white',
    padding: '0.6rem 1.25rem',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  searchInput: {
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    fontSize: '0.875rem',
    width: '100%',
    color: 'var(--text)',
  },
  actionsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  iconButton: {
    position: 'relative',
    color: 'var(--text-muted)',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: 'white',
      color: 'var(--primary)',
    }
  },
  notifBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--danger)',
    borderRadius: '50%',
    border: '2px solid var(--bg)',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--border)',
    margin: '0 0.5rem',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginRight: '0.5rem',
  },
  profileName: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1.2,
  },
  profileRole: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  logoutButton: {
    color: 'var(--danger)',
    padding: '0.5rem 0.875rem',
    borderRadius: '10px',
    backgroundColor: 'white',
    border: '1px solid #fee2e2',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.05)',
  }
};

export default Header;
