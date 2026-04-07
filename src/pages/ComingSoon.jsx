/**
 * ComingSoon.jsx
 * ─────────────────────────────────────────────────────────
 * Componente de página genérico que se muestra cuando un
 * módulo aún no ha sido implementado. Recibe el nombre del
 * módulo como prop y muestra un mensaje informativo con
 * estilos coherentes al diseño de SmartHall.
 */

import { Clock } from 'lucide-react';

/**
 * @param {object} props
 * @param {string} props.modulo - Nombre del módulo próximamente disponible
 */
const ComingSoon = ({ modulo = 'Este módulo' }) => {
  return (
    <div className="fade-in" style={styles.wrapper}>
      {/* Ícono decorativo */}
      <div style={styles.iconContainer}>
        <Clock size={40} color="var(--primary)" />
      </div>

      {/* Título principal */}
      <h2 style={styles.title}>{modulo}</h2>

      {/* Mensaje principal */}
      <p style={styles.message}>Este módulo estará disponible pronto.</p>

      {/* Descripción adicional */}
      <p style={styles.sub}>
        Estamos trabajando para traerte esta funcionalidad. <br />
        Por favor vuelve más tarde.
      </p>
    </div>
  );
};

// Estilos en línea del componente
const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
    gap: '1rem',
  },
  iconContainer: {
    backgroundColor: 'var(--primary-light)',
    borderRadius: '50%',
    padding: '1.5rem',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  message: {
    fontSize: '1.1rem',
    color: 'var(--primary)',
    fontWeight: 600,
  },
  sub: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
  },
};

export default ComingSoon;
