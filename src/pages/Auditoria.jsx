/**
 * Auditoria.jsx
 * ─────────────────────────────────────────────────────────
 * Historial de acciones del sistema para administradores.
 */

import React, { useEffect, useState } from 'react';
import { useAuditoria } from '../hooks/useAuditoria';
import { History, Search, Filter, User, Calendar, Activity, Eye } from 'lucide-react';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';

const Auditoria = () => {
  const { logs, loading, fetchLogs } = useAuditoria();
  const [filtros, setFiltros] = useState({ entidad: '', accion: '' });

  useEffect(() => {
    fetchLogs(filtros);
  }, [filtros]);

  const columns = [
    { 
      header: 'Fecha', 
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: '600' }}>{new Date(row.created_at).toLocaleDateString()}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(row.created_at).toLocaleTimeString()}</span>
        </div>
      )
    },
    { 
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
      header: 'Acción', 
      render: (row) => (
        <Badge variant={
          row.accion === 'CREAR' ? 'success' : 
          row.accion === 'ELIMINAR' ? 'error' : 
          row.accion === 'EDITAR' ? 'warning' : 'info'
        }>
          {row.accion}
        </Badge>
      )
    },
    { header: 'Entidad', render: (row) => <span style={{ fontWeight: '500' }}>{row.entidad}</span> },
    { 
      header: 'Detalles', 
      render: (row) => (
        <div style={styles.detailsCell}>
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
          <input 
            placeholder="Buscar por usuario o acción..." 
            style={styles.searchInput}
          />
        </div>
        <div style={styles.filterGroup}>
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
        <Table columns={columns} data={logs} loading={loading} />
      </div>
    </div>
  );
};

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
