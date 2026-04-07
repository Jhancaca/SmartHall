/**
 * Table.jsx
 * ─────────────────────────────────────────────────────────
 * Componente de tabla genérica con soporte para paginación local.
 * 
 * Se adapta a cualquier tipo de datos mediante una configuración de columnas.
 * 
 * Props:
 *  - columns: Array de objetos { header: string, accessor: string, render: function }.
 *  - data: Array de objetos con la información a mostrar.
 *  - itemsPerPage: Cantidad de filas por página (defecto 5).
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Table = ({ columns, data, itemsPerPage = 5 }) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculamos los datos de la página actual de forma eficiente
  const { currentData, totalPages, startIndex } = useMemo(() => {
    const total = Math.ceil(data.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    return {
      currentData: data.slice(start, start + itemsPerPage),
      totalPages: total,
      startIndex: start
    };
  }, [data, currentPage, itemsPerPage]);

  // Navegación de páginas
  const handlePrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  return (
    <div style={styles.container}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          {/* Encabezado */}
          <thead style={styles.thead}>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={styles.th}>{col.header}</th>
              ))}
            </tr>
          </thead>
          
          {/* Cuerpo */}
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row, i) => (
                <tr key={i} style={styles.tr}>
                  {columns.map((col, j) => (
                    <td key={j} style={styles.td}>
                      {/* Si hay una función render personalizada la usa, sino usa el accessor */}
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={styles.empty}>
                  No se encontraron resultados para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginación (Solo si hay más de una página) */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <span style={styles.pageInfo}>
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, data.length)} de {data.length} registros
          </span>
          <div style={styles.pageControls}>
            <button onClick={handlePrev} disabled={currentPage === 1} style={styles.pageBtn}>
              <ChevronLeft size={18} />
            </button>
            <span style={styles.pageText}>Página {currentPage} de {totalPages}</span>
            <button onClick={handleNext} disabled={currentPage === totalPages} style={styles.pageBtn}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos internos de la tabla
const styles = {
  container: {
    backgroundColor: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thead: {
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid var(--border)',
  },
  th: {
    padding: '0.875rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background-color 0.1s',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: 'var(--text)',
  },
  empty: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
  pagination: {
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border)',
    backgroundColor: 'var(--white)',
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
  },
  pageControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  pageBtn: {
    padding: '0.4rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text)',
    backgroundColor: 'white',
    transition: 'all 0.2s',
  },
  pageText: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    minWidth: '100px',
    textAlign: 'center'
  }
};

export default Table;
