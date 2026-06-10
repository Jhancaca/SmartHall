/**
 * Auditoria.jsx
 * ─────────────────────────────────────────────────────────
 * Página de historial de auditoría para administradores del sistema SmartHall.
 * 
 * Propósito:
 * - Mostrar un registro cronológico de todas las acciones realizadas en el sistema.
 * - Permitir filtrar registros por entidad (Reservas, Inventario, Usuarios) y por tipo de acción.
 * - Visualizar detalles de cada acción, incluyendo fecha, usuario, entidad y detalles adicionales.
 * 
 * Hooks utilizados:
 * - useAuditoria: Custom hook que gestiona la obtención de logs de auditoría desde la API.
 *   Retorna: logs (array de objetos de log), loading (booleano de carga), fetchLogs (función para obtener logs).
 * 
 * APIs/Dependencias:
 * - Componentes UI: Table (tabla genérica), Badge (etiqueta para estados).
 * - Iconos de lucide-react: History, Search, Filter, User, Calendar, Activity, Eye.
 * - Estado local: filtros (entidad y acción para filtrar logs).
 * 
 * Renderiza:
 * - Encabezado con título y estadísticas (número total de registros).
 * - Barra de filtros con búsqueda por usuario/acción y selects para entidad y acción.
 * - Tabla de auditoría con columnas: Fecha, Usuario, Acción, Entidad, Detalles.
 */

import React, { useEffect, useState } from 'react';
import { useAuditoria } from '../hooks/useAuditoria';
import { History, Search, Filter, User, Calendar, Activity, Eye } from 'lucide-react';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';

/**
 * Componente funcional que renderiza la página de auditoría del sistema.
 * 
 * @description Gestiona el estado de los filtros y obtiene los logs de auditoría
 * basándose en los filtros aplicados. Muestra una tabla con los registros filtrados.
 * 
 * @returns {JSX.Element} Elemento JSX que representa la página de auditoría con
 * encabezado, filtros y tabla de logs.
 */
const Auditoria = () => {
  // Hook personalizado para obtener logs de auditoría desde la API
  const { logs, loading, fetchLogs } = useAuditoria();
  
  // Estado local para los filtros de búsqueda: entidad (ej. RESERVAS, USUARIOS) y acción (ej. CREAR, EDITAR)
  const [filtros, setFiltros] = useState({ entidad: '', accion: '' });

  // Efecto que se ejecuta cada vez que cambian los filtros para obtener logs actualizados
  useEffect(() => {
    fetchLogs(filtros);
  }, [filtros]);

  // Definición de columnas para la tabla de auditoría
  // Cada columna incluye un encabezado y una función render para personalizar la visualización
  const columns = [
    { 
      // Columna de fecha: muestra fecha y hora del registro
      header: 'Fecha', 
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: '600' }}>{new Date(row.created_at).toLocaleDateString()}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(row.created_at).toLocaleTimeString()}</span>
        </div>
      )
    },
    { 
      // Columna de usuario: muestra nombre completo y email del usuario que realizó la acción
      header: 'Usuario', 
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.avatar}>
            <User size={14} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600' }}>{row.usuarios?.nombres} {row.usuarios?.apellidos}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.usuarios?.email}</span>
          </div>
        </div>
      )
    },
    { 
      // Columna de acción: muestra el tipo de acción con un badge de color según el tipo
      header: 'Acción', 
      render: (row) => (
        // Badge de color: success (CREAR), error (ELIMINAR), warning (EDITAR), info (otros)
        <Badge variant={
          row.accion === 'CREAR' ? 'success' : 
          row.accion === 'ELIMINAR' ? 'error' : 
          row.accion === 'EDITAR' ? 'warning' : 'info'
        }>
          {row.accion}
        </Badge>
      )
    },
    { 
      // Columna de entidad: muestra la entidad afectada (ej. RESERVAS, INSUMOS, USUARIOS)
      header: 'Entidad', 
      render: (row) => <span style={{ fontWeight: '500' }}>{row.entidad}</span> 
    },
    { 
      // Columna de detalles: muestra un resumen de los detalles de la acción
      header: 'Detalles', 
      render: (row) => (
        <div style={styles.detailsCell}>
          {/* Mostrar detalles como string o truncar JSON a 50 caracteres */}
          {typeof row.detalles === 'string' ? row.detalles : JSON.stringify(row.detalles).substring(0, 50) + '...'}
          <button style={styles.viewBtn} title="Ver detalles completos">
            <Eye size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Auditoría de Sistema</h1>
          <p style={styles.subtitle}>Rastreo completo de actividades y cambios en SmartHall.</p>
        </div>
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <Activity size={20} color="var(--primary)" />
            <div>
              <span style={styles.statValue}>{logs.length}</span>
              <span style={styles.statLabel}>Registros</span>
            </div>
          </div>
        </div>
      </header>

      <div style={styles.filterBar}>
        <div style={styles.searchGroup}>
          <Search size={18} color="var(--text-muted)" />
          {/* Input de búsqueda: actualmente no está conectado a la lógica de filtrado */}
          <input 
            placeholder="Buscar por usuario o acción..." 
            style={styles.searchInput}
          />
        </div>
        <div style={styles.filterGroup}>
          {/* Select para filtrar por entidad: actualiza el estado de filtros y dispara useEffect */}
          <select 
            value={filtros.entidad} 
            onChange={e => setFiltros({...filtros, entidad: e.target.value})}
            style={styles.select}
          >
            <option value="">Todas las entidades</option>
            <option value="RESERVAS">Reservas</option>
            <option value="INSUMOS">Inventario</option>
            <option value="USUARIOS">Usuarios</option>
          </select>
          {/* Select para filtrar por acción: actualiza el estado de filtros y dispara useEffect */}
          <select 
            value={filtros.accion} 
            onChange={e => setFiltros({...filtros, accion: e.target.value})}
            style={styles.select}
          >
            <option value="">Todas las acciones</option>
            <option value="CREAR">Crear</option>
            <option value="EDITAR">Editar</option>
            <option value="ELIMINAR">Eliminar</option>
            <option value="APROBAR">Aprobar</option>
            <option value="RECHAZAR">Rechazar</option>
          </select>
        </div>
      </div>

      <div style={styles.tableCard}>
        {/* Tabla genérica que muestra los logs de auditoría con las columnas definidas */}
        <Table columns={columns} data={logs} loading={loading} />
      </div>
    </div>
  );
};

// Objeto de estilos CSS en línea para el componente de auditoría
// Define la apariencia visual de todos los elementos de la interfaz
const styles = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  title: { fontSize: '2rem', fontWeight: '800', color: 'var(--text-dark)', margin: 0 },
  subtitle: { color: 'var(--text-muted)', marginTop: '0.25rem' },
  stats: { display: 'flex', gap: '1rem' },
  statCard: { 
    backgroundColor: '#fff', 
    padding: '1rem 1.5rem', 
    borderRadius: '1rem', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0'
  },
  statValue: { display: 'block', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)' },
  statLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' },
  filterBar: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: '1rem', 
    borderRadius: '1rem', 
    marginBottom: '1.5rem',
    border: '1px solid #e2e8f0'
  },
  searchGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, paddingLeft: '0.5rem' },
  searchInput: { border: 'none', outline: 'none', fontSize: '0.875rem', width: '100%' },
  filterGroup: { display: 'flex', gap: '0.75rem' },
  select: { 
    padding: '0.5rem 1rem', 
    borderRadius: '0.5rem', 
    border: '1px solid #e2e8f0', 
    fontSize: '0.875rem', 
    fontWeight: '500',
    color: 'var(--text-dark)',
    backgroundColor: '#f8fafc'
  },
  tableCard: { 
    backgroundColor: '#fff', 
    borderRadius: '1rem', 
    overflow: 'hidden', 
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0'
  },
  avatar: { 
    width: '32px', 
    height: '32px', 
    borderRadius: '50%', 
    backgroundColor: 'var(--primary-light)', 
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailsCell: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' },
  viewBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px' }
};

export default Auditoria;
