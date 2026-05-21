/**
 * LoadingSpinner.jsx
 * ─────────────────────────────────────────────────────────
 * Indicador de carga reutilizable con animación premium.
 *
 * Patrón: patterns-explicit-variants (skill: composition-patterns)
 * Ofrece variantes explícitas por tamaño y contexto en lugar
 * de props booleanas.
 *
 * @param {'sm' | 'md' | 'lg'} size     - Tamaño del spinner
 * @param {string}              message  - Mensaje opcional debajo del spinner
 * @param {boolean}             fullPage - Si ocupa toda la página
 */

const SIZES = {
  sm: { width: 20, height: 20, border: 2 },
  md: { width: 36, height: 36, border: 3 },
  lg: { width: 48, height: 48, border: 4 },
};

const LoadingSpinner = ({ size = 'md', message = '', fullPage = false }) => {
  const dims = SIZES[size] || SIZES.md;

  const spinner = (
    <div style={styles.container}>
      <div
        style={{
          width: dims.width,
          height: dims.height,
          border: `${dims.border}px solid var(--border)`,
          borderTop: `${dims.border}px solid var(--primary)`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {message ? <p style={styles.message}>{message}</p> : null}
    </div>
  );

  if (fullPage) {
    return <div style={styles.fullPage}>{spinner}</div>;
  }

  return spinner;
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-md)',
    padding: 'var(--space-xl)',
  },
  fullPage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  message: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    margin: 0,
  },
};

export default LoadingSpinner;
