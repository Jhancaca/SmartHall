/**
 * EmptyState.jsx
 * ─────────────────────────────────────────────────────────
 * Componente de estado vacío reutilizable para listas y tablas sin datos.
 *
 * Patrón: children-over-render-props (skill: composition-patterns)
 * Usa children para composición flexible en lugar de renderX props.
 *
 * @param {React.ReactNode} icon     - Ícono de lucide-react
 * @param {string}          title    - Título principal
 * @param {string}          message  - Descripción o instrucción
 * @param {React.ReactNode} children - Acciones opcionales (botones)
 */

const EmptyState = ({ icon: Icon, title, message, children }) => {
  return (
    <div style={styles.container} className="fade-in">
      {Icon ? (
        <div style={styles.iconWrapper}>
          <Icon size={48} strokeWidth={1.5} color="var(--text-disabled)" />
        </div>
      ) : null}

      {title ? <h3 style={styles.title}>{title}</h3> : null}
      {message ? <p style={styles.message}>{message}</p> : null}

      {children ? <div style={styles.actions}>{children}</div> : null}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-2xl) var(--space-xl)',
    textAlign: 'center',
    gap: 'var(--space-sm)',
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 'var(--radius-xl)',
    backgroundColor: 'var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--space-sm)',
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  message: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
    margin: 0,
    maxWidth: 360,
    lineHeight: 1.6,
  },
  actions: {
    marginTop: 'var(--space-md)',
    display: 'flex',
    gap: 'var(--space-sm)',
  },
};

export default EmptyState;
