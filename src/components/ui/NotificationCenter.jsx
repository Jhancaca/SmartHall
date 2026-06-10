/**
 * NotificationCenter.jsx
 * ─────────────────────────────────────────────────────────
 * Componente de centro de notificaciones con dropdown desplegable.
 *
 * Se renderiza en el Header.jsx y permite:
 *  - Ver el contador de notificaciones no leídas (badge rojo).
 *  - Abrir un dropdown con la lista de notificaciones recientes.
 *  - Marcar notificaciones individuales o todas como leídas.
 *  - Navegar automáticamente al módulo correspondiente al hacer clic en una notificación.
 *  - Cerrar el dropdown al hacer clic fuera de él.
 *
 * Hook utilizado: useNotifications (inserción incremental, sin re-fetch completo).
 *
 * Tablas de Supabase involucradas:
 *  - notificaciones: Lee las notificaciones del usuario actual.
 *
 * @module components/ui/NotificationCenter
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

/**
 * NotificationCenter
 * Componente de dropdown de notificaciones para el Header.
 * Muestra badge con contador y lista desplegable de notificaciones.
 */
const NotificationCenter = () => {
  const navigate = useNavigate();
  // Hook de notificaciones con inserción incremental (optimizado)
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  // Estado de apertura del dropdown
  const [isOpen, setIsOpen] = useState(false);
  // Referencia al contenedor del dropdown para detectar clics fuera
  const dropdownRef = useRef(null);

  /**
   * Efecto para cerrar el dropdown al hacer clic fuera del componente.
   * Agrega un listener global de 'mousedown' al montar y lo remueve al desmontar.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Si el clic fue fuera del dropdownRef, cerrar el dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * getIcon
   * Retorna el ícono visual correspondiente al tipo de notificación.
   *
   * @param {string} tipo - Tipo de notificación: 'success' | 'warning' | 'error' | 'info'.
   * @returns {JSX.Element} Ícono de lucide-react con color semántico.
   */
  const getIcon = (tipo) => {
    switch (tipo) {
      case 'success': return <CheckCircle size={16} color="#10B981" />;
      case 'warning': return <AlertTriangle size={16} color="#F59E0B" />;
      case 'error': return <AlertTriangle size={16} color="#EF4444" />;
      default: return <Info size={16} color="#2563EB" />;
    }
  };

  /**
   * formatearTiempo
   * Convierte una fecha ISO a un formato relativo legible (ej: "Hace 5 min", "Hace 2 h").
   *
   * @param {string} fecha - Fecha en formato ISO (desde la BD).
   * @returns {string} Texto con el tiempo transcurrido o la fecha formateada.
   */
  const formatearTiempo = (fecha) => {
    const ahora = new Date();
    const diff = ahora - new Date(fecha); // Diferencia en milisegundos
    const minutos = Math.floor(diff / 60000); // Convertir a minutos
    if (minutos < 1) return 'Ahora'; // Menos de 1 minuto
    if (minutos < 60) return `Hace ${minutos} min`; // Menos de 1 hora
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`; // Menos de 1 día
    return new Date(fecha).toLocaleDateString(); // Más de 1 día: mostrar fecha
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Botón de la campana con badge de contador */}
      <button 
        style={styles.bellButton} 
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones"
      >
        <Bell size={20} color={isOpen ? 'var(--primary)' : 'var(--text-muted)'} />
        {/* Badge de notificaciones no leídas (máximo 9+) */}
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown de notificaciones (solo visible cuando isOpen es true) */}
      {isOpen && (
        <div style={styles.dropdown} className="card fade-in">
          {/* Encabezado del dropdown con título y botón "Marcar todo como leído" */}
          <div style={styles.header}>
            <h3 style={styles.title}>Notificaciones</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={styles.markAll}>
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* Lista de notificaciones con scroll vertical */}
          <div style={styles.list}>
            {loading ? (
              <div style={styles.empty}>Cargando...</div>
            ) : notifications.length === 0 ? (
              // Estado vacío cuando no hay notificaciones
              <div style={styles.empty}>
                <Clock size={32} color="var(--border)" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              // Renderizar cada notificación como un elemento clickeable
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  style={{
                    ...styles.item,
                    // Fondo azul claro para notificaciones no leídas
                    backgroundColor: n.leida ? 'transparent' : 'var(--primary-light)'
                  }}
                  onClick={() => {
                    // Marcar como leída si no lo está
                    if (!n.leida) markAsRead(n.id);
                    // Navegar al vínculo asociado si existe
                    if (n.vinculo) navigate(n.vinculo);
                    setIsOpen(false); // Cerrar dropdown tras la acción
                  }}
                >
                  {/* Ícono del tipo de notificación */}
                  <div style={styles.itemIcon}>{getIcon(n.tipo)}</div>
                  <div style={styles.itemContent}>
                    <p style={styles.itemTitle}>{n.titulo}</p>
                    <p style={styles.itemMsg}>{n.mensaje}</p>
                    <span style={styles.itemTime}>{formatearTiempo(n.created_at)}</span>
                  </div>
                  {/* Punto azul indicador de no leída */}
                  {!n.leida && <div style={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>

          {/* Pie del dropdown */}
          <div style={styles.footer}>
            <button style={styles.viewAll}>Ver todas las notificaciones</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  bellButton: {
    position: 'relative',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    transition: 'all 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: '#EF4444',
    color: 'white',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    minWidth: '16px',
    height: '16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    border: '2px solid white',
  },
  dropdown: {
    position: 'absolute',
    top: '50px',
    right: '0',
    width: '320px',
    maxHeight: '450px',
    zIndex: 1000,
    padding: '0',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: '700',
    margin: 0,
  },
  markAll: {
    fontSize: '0.75rem',
    color: 'var(--primary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontWeight: '600',
  },
  list: {
    maxHeight: '350px',
    overflowY: 'auto',
    backgroundColor: 'white',
  },
  item: {
    display: 'flex',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    position: 'relative',
    '&:hover': {
      backgroundColor: 'var(--bg)',
    }
  },
  itemIcon: {
    marginTop: '2px',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    margin: '0 0 2px 0',
    color: 'var(--text)',
  },
  itemMsg: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    margin: '0 0 4px 0',
    lineHeight: '1.3',
  },
  itemTime: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--primary)',
    borderRadius: '50%',
    position: 'absolute',
    right: '1rem',
    top: '1.25rem',
  },
  empty: {
    padding: '3rem 1rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  footer: {
    padding: '0.75rem',
    borderTop: '1px solid var(--border)',
    textAlign: 'center',
    backgroundColor: 'var(--bg)',
  },
  viewAll: {
    background: 'none',
    border: 'none',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    cursor: 'pointer',
  }
};

export default NotificationCenter;
