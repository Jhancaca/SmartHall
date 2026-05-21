/**
 * PageHeader.jsx
 * ─────────────────────────────────────────────────────────
 * Encabezado reutilizable de sección con título, subtítulo
 * y acciones opcionales.
 *
 * Patrón: children-over-render-props (skill: composition-patterns)
 * Las acciones se pasan como children para máxima composición.
 *
 * @param {string}          title    - Título principal de la página
 * @param {string}          subtitle - Descripción breve
 * @param {React.ReactNode} children - Acciones (botones, filtros)
 */

const PageHeader = ({ title, subtitle, children }) => {
  return (
    <div style={styles.header}>
      <div style={styles.textBlock}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {children ? <div style={styles.actions}>{children}</div> : null}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-xl)',
  },
  textBlock: {
    flex: 1,
    minWidth: 200,
  },
  title: {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
    margin: 'var(--space-xs) 0 0 0',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap',
  },
};

export default PageHeader;
