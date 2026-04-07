/**
 * Modal.jsx
 * ─────────────────────────────────────────────────────────
 * Componente UI reutilizable para ventanas emergentes.
 * 
 * Se utiliza para formularios de creación y edición (Usuarios e Inventario).
 * Incluye un fondo semi-transparente (overlay) con efecto de desenfoque
 * y una caja central que contiene el contenido del formulario.
 * 
 * Props:
 *  - isOpen: Booleano que controla la visibilidad.
 *  - onClose: Función para cerrar el modal (al hacer clic en X).
 *  - title: Texto del encabezado del modal.
 *  - children: Contenido (JSX) que se renderiza dentro del modal.
 */

import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  // Si no está abierto, no renderiza nada
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      {/* Evitamos que el clic dentro del modal cierre la ventana propagando hacia el overlay */}
      <div 
        style={styles.modal} 
        className="fade-in" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div style={styles.header}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={styles.closeButton} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal (Donde van los formularios) */}
        <div style={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Estilos específicos para el Modal
const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)', // Backdrop oscuro
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backdropFilter: 'blur(4px)', // Desenfoque moderno
  },
  modal: {
    backgroundColor: 'var(--white)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '550px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    color: 'var(--text-muted)',
    padding: '0.25rem',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  },
  body: {
    padding: '1.5rem',
  }
};

export default Modal;
