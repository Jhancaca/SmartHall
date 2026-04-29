import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'success': return <CheckCircle size={16} color="#10B981" />;
      case 'warning': return <AlertTriangle size={16} color="#F59E0B" />;
      case 'error': return <AlertTriangle size={16} color="#EF4444" />;
      default: return <Info size={16} color="#2563EB" />;
    }
  };

  const formatearTiempo = (fecha) => {
    const ahora = new Date();
    const diff = ahora - new Date(fecha);
    const minutos = Math.floor(diff / 60000);
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    return new Date(fecha).toLocaleDateString();
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        style={styles.bellButton} 
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones"
      >
        <Bell size={20} color={isOpen ? 'var(--primary)' : 'var(--text-muted)'} />
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown} className="card fade-in">
          <div style={styles.header}>
            <h3 style={styles.title}>Notificaciones</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={styles.markAll}>
                Marcar todo como leído
              </button>
            )}
          </div>

          <div style={styles.list}>
            {loading ? (
              <div style={styles.empty}>Cargando...</div>
            ) : notifications.length === 0 ? (
              <div style={styles.empty}>
                <Clock size={32} color="var(--border)" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  style={{
                    ...styles.item,
                    backgroundColor: n.leida ? 'transparent' : 'var(--primary-light)'
                  }}
                  onClick={() => {
                    if (!n.leida) markAsRead(n.id);
                    if (n.vinculo) navigate(n.vinculo);
                    setIsOpen(false);
                  }}
                >
                  <div style={styles.itemIcon}>{getIcon(n.tipo)}</div>
                  <div style={styles.itemContent}>
                    <p style={styles.itemTitle}>{n.titulo}</p>
                    <p style={styles.itemMsg}>{n.mensaje}</p>
                    <span style={styles.itemTime}>{formatearTiempo(n.created_at)}</span>
                  </div>
                  {!n.leida && <div style={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>

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
