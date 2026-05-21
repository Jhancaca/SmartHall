/**
 * Dashboard.jsx
 * ─────────────────────────────────────────────────────────
 * Panel Analítico e Interactivo Principal de SmartHall.
 * 
 * Características Premium:
 *  - Filtros dinámicos en cabecera (Rango de fechas y tipo de evento).
 *  - KPIs analíticos en tiempo real con micro-animaciones.
 *  - Gráficos interactivos de vanguardia usando **Recharts**:
 *     1. Gráfico de Dona para la distribución de estados de reserva.
 *     2. Gráfico de Barras Degradadas para la clasificación por tipos de evento.
 *  - Bitácora de Auditoría en tiempo real con los últimos 5 eventos.
 *  - Integración optimizada con TanStack Query y Supabase.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReservas } from '../hooks/useReservas';
import { useInventario } from '../hooks/useInventario';
import { useAuditoria } from '../hooks/useAuditoria';
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Search,
  Filter,
  Activity,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const Dashboard = () => {
  const { profile } = useAuth();
  
  // Hooks
  const { reservas, loading: loadingReservas, fetchReservas } = useReservas();
  const { insumos, loading: loadingInsumos, fetchInsumos } = useInventario();
  const { logs, loading: loadingAuditoria, fetchLogs } = useAuditoria();

  // Filtros del Dashboard
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoEventoFiltro, setTipoEventoFiltro] = useState('todos');
  const [cargandoGlobal, setCargandoGlobal] = useState(false);

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setCargandoGlobal(true);
    try {
      await Promise.all([
        fetchReservas(),
        fetchInsumos(),
        fetchLogs()
      ]);
    } finally {
      setCargandoGlobal(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // 1. Filtrado de datos para Analíticas
  // ────────────────────────────────────────────────────────

  const reservasFiltradas = useMemo(() => {
    const raw = Array.isArray(reservas) ? reservas : [];
    return raw.filter(r => {
      // Filtro de Fecha de Evento
      if (fechaInicio && new Date(r.fecha_evento) < new Date(fechaInicio)) return false;
      if (fechaFin && new Date(r.fecha_evento) > new Date(fechaFin)) return false;
      
      // Filtro por Tipo de Evento
      if (tipoEventoFiltro !== 'todos' && r.tipo_evento !== tipoEventoFiltro) return false;

      return true;
    });
  }, [reservas, fechaInicio, fechaFin, tipoEventoFiltro]);

  // ────────────────────────────────────────────────────────
  // 2. Cálculos de KPIs Analíticos
  // ────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total = reservasFiltradas.length;
    const pendientes = reservasFiltradas.filter(r => r.estado === 'pendiente').length;
    const aprobadas = reservasFiltradas.filter(r => r.estado === 'aprobada').length;
    const rechazadas = reservasFiltradas.filter(r => r.estado === 'rechazada').length;
    const canceladas = reservasFiltradas.filter(r => r.estado === 'cancelada').length;

    // Calcular total de invitados en reservas aprobadas
    const totalInvitadosAprobados = reservasFiltradas
      .filter(r => r.estado === 'aprobada')
      .reduce((sum, r) => sum + (r.numero_invitados || 0), 0);

    // Calcular insumos en estado crítico (cantidad_disponible <= 2)
    const insumosCriticos = (Array.isArray(insumos) ? insumos : [])
      .filter(i => i.cantidad_disponible <= 2).length;

    return {
      total,
      pendientes,
      aprobadas,
      rechazadas,
      canceladas,
      totalInvitadosAprobados,
      insumosCriticos
    };
  }, [reservasFiltradas, insumos]);

  // ────────────────────────────────────────────────────────
  // 3. Preparación de Datos para Gráficos
  // ────────────────────────────────────────────────────────

  // Datos para Dona de Estados
  const dataPie = useMemo(() => {
    return [
      { name: 'Aprobadas', value: kpis.aprobadas, color: '#10B981' },
      { name: 'Pendientes', value: kpis.pendientes, color: '#F59E0B' },
      { name: 'Rechazadas', value: kpis.rechazadas, color: '#EF4444' },
      { name: 'Canceladas', value: kpis.canceladas, color: '#64748B' }
    ].filter(item => item.value > 0);
  }, [kpis]);

  // Datos para Barras de Eventos
  const dataBar = useMemo(() => {
    const conteo = {};
    reservasFiltradas.forEach(r => {
      const tipo = r.tipo_evento || 'Otro';
      conteo[tipo] = (conteo[tipo] || 0) + 1;
    });

    return Object.keys(conteo).map(key => ({
      name: key,
      cantidad: conteo[key]
    })).sort((a, b) => b.cantidad - a.cantidad);
  }, [reservasFiltradas]);

  // Logs Recientes (Bitácora de 5 elementos)
  const logsRecientes = useMemo(() => {
    const raw = Array.isArray(logs) ? logs : [];
    return raw.slice(0, 5);
  }, [logs]);

  return (
    <div className="fade-in" style={styles.page}>
      
      {/* Cabecera Interactiva del Escritorio */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.titulo}>¡Hola de nuevo, {profile?.nombres}! 👋</h1>
          <p style={styles.subtitulo}>Aquí tienes el centro de control del salón social de SmartHall.</p>
        </div>

        {/* Grupo de Filtros Dinámicos */}
        <div style={styles.filtrosCabecera}>
          <div style={styles.filtroFlex}>
            <Calendar size={16} color="var(--text-muted)" />
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              style={styles.inputFiltro}
              title="Fecha Inicio"
            />
            <span style={{ color: '#94A3B8', fontWeight: 'bold' }}>a</span>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              style={styles.inputFiltro}
              title="Fecha Fin"
            />
          </div>

          <div style={styles.filtroFlex}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={tipoEventoFiltro}
              onChange={e => setTipoEventoFiltro(e.target.value)}
              style={styles.selectFiltro}
            >
              <option value="todos">Todos los eventos</option>
              <option value="Cumpleaños">Cumpleaños</option>
              <option value="Asamblea">Asamblea</option>
              <option value="Fiesta">Fiesta</option>
              <option value="Reunión">Reunión</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <button onClick={cargarTodo} style={styles.btnCargar} title="Sincronizar Datos">
            <RefreshCw size={16} className={cargandoGlobal ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Grid de KPIs Analíticos */}
      <section style={styles.kpiGrid}>
        
        {/* KPI 1: Pendientes */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <Clock size={22} color="#D97706" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Reservas Pendientes</p>
            <h2 style={{ ...styles.kpiValue, color: '#D97706' }}>{kpis.pendientes}</h2>
            <p style={styles.kpiSub}>Acción requerida urgente</p>
          </div>
        </div>

        {/* KPI 2: Aprobadas */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <CheckCircle size={22} color="#059669" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Reservas Aprobadas</p>
            <h2 style={{ ...styles.kpiValue, color: '#059669' }}>{kpis.aprobadas}</h2>
            <p style={styles.kpiSub}>Listas para ejecución</p>
          </div>
        </div>

        {/* KPI 3: Total Aforo */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
            <Users size={22} color="#2563EB" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Aforo Agendado</p>
            <h2 style={{ ...styles.kpiValue, color: '#2563EB' }}>{kpis.totalInvitadosAprobados}</h2>
            <p style={styles.kpiSub}>Invitados esperados</p>
          </div>
        </div>

        {/* KPI 4: Insumos Críticos */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <AlertTriangle size={22} color="#DC2626" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Insumos Críticos</p>
            <h2 style={{ ...styles.kpiValue, color: '#DC2626' }}>{kpis.insumosCriticos}</h2>
            <p style={styles.kpiSub}>Stock bajo (2 o menos)</p>
          </div>
        </div>
      </section>

      {/* Sección Analítica de Gráficos */}
      <section style={styles.chartsGrid}>
        
        {/* Gráfico 1: Dona de Estado de Reservas */}
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3 style={styles.chartTitle}>Distribución de Reservas</h3>
            <p style={styles.chartSubtitle}>Proporción según estado actual</p>
          </div>
          <div style={styles.chartContent}>
            {dataPie.length === 0 ? (
              <div style={styles.sinGraficos}>No hay reservas registradas en este rango.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={dataPie}
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dataPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={10}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', marginTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Barras de Tipos de Evento */}
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3 style={styles.chartTitle}>Tipos de Evento</h3>
            <p style={styles.chartSubtitle}>Clasificación por tipo de celebración</p>
          </div>
          <div style={styles.chartContent}>
            {dataBar.length === 0 ? (
              <div style={styles.sinGraficos}>No hay tipos de evento registrados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataBar}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#1E4ED8" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <Bar dataKey="cantidad" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Sección Inferior: Bitácora de Auditoría en Tiempo Real */}
      <section style={styles.bottomSection}>
        <div style={styles.bitacoraCard}>
          <div style={styles.bitacoraHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={styles.activityBox}>
                <Activity size={18} color="var(--primary)" />
              </div>
              <div>
                <h3 style={styles.bitacoraTitle}>Actividad y Auditoría Reciente</h3>
                <p style={styles.bitacoraSubtitle}>Bitácora de seguridad en tiempo real</p>
              </div>
            </div>
          </div>

          <div style={styles.timeline}>
            {loadingAuditoria ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                Cargando bitácora de actividad...
              </div>
            ) : logsRecientes.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                Sin actividades registradas recientemente.
              </div>
            ) : (
              logsRecientes.map((log, index) => {
                const isLast = index === logsRecientes.length - 1;
                return (
                  <div key={log.id} style={styles.timelineItem}>
                    
                    {/* Indicador de Línea Temporal */}
                    <div style={styles.timelinePointContainer}>
                      <div style={styles.timelinePoint} />
                      {!isLast && <div style={styles.timelineLine} />}
                    </div>

                    {/* Contenido de la bitácora */}
                    <div style={styles.timelineContent}>
                      <div style={styles.timelineMeta}>
                        <span style={styles.logUsuario}>
                          {log.usuarios ? `${log.usuarios.nombres} ${log.usuarios.apellidos}` : 'Sistema'}
                        </span>
                        <span style={styles.logFecha}>
                          {new Date(log.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div style={styles.logDesc}>
                        <span style={{
                          ...styles.logBadge,
                          backgroundColor:
                            log.accion === 'CREAR' ? 'rgba(16, 185, 129, 0.12)' :
                            log.accion === 'ELIMINAR' ? 'rgba(239, 68, 68, 0.12)' :
                            log.accion === 'EDITAR' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                          color:
                            log.accion === 'CREAR' ? '#059669' :
                            log.accion === 'ELIMINAR' ? '#DC2626' :
                            log.accion === 'EDITAR' ? '#D97706' : '#2563EB',
                        }}>
                          {log.accion}
                        </span>
                        <span style={styles.logDetalle}>
                          {log.detalles || `Cambio realizado en ${log.entidad}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Keyframes del CSS para rotación del botón Refresh */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1.5rem'
  },
  titulo: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#0F172A',
    margin: 0,
    letterSpacing: '-0.025em'
  },
  subtitulo: {
    fontSize: '0.95rem',
    color: '#64748B',
    margin: '0.25rem 0 0 0'
  },
  filtrosCabecera: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  filtroFlex: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '0 0.75rem',
    height: '40px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },
  inputFiltro: {
    border: 'none',
    outline: 'none',
    fontSize: '0.825rem',
    color: '#334155',
    fontWeight: '500',
    background: 'transparent'
  },
  selectFiltro: {
    border: 'none',
    outline: 'none',
    fontSize: '0.825rem',
    color: '#334155',
    fontWeight: '600',
    cursor: 'pointer',
    backgroundColor: 'transparent'
  },
  btnCargar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    color: '#475569',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#F8FAFC',
      color: 'var(--primary)'
    }
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)'
    }
  },
  kpiIconWrapper: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  kpiLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0
  },
  kpiValue: {
    fontSize: '1.75rem',
    fontWeight: '800',
    margin: '2px 0'
  },
  kpiSub: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    margin: 0
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
  },
  chartHeader: {
    marginBottom: '1rem'
  },
  chartTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#0F172A',
    margin: 0
  },
  chartSubtitle: {
    fontSize: '0.8rem',
    color: '#64748B',
    margin: '2px 0 0 0'
  },
  chartContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '220px'
  },
  sinGraficos: {
    fontSize: '0.875rem',
    color: '#94A3B8',
    fontStyle: 'italic'
  },
  bottomSection: {
    marginTop: '2rem'
  },
  bitacoraCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '1.5rem 2rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
  },
  bitacoraHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '1rem',
    marginBottom: '1.5rem'
  },
  activityBox: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: 'var(--primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bitacoraTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#0F172A',
    margin: 0
  },
  bitacoraSubtitle: {
    fontSize: '0.8rem',
    color: '#64748B',
    margin: '2px 0 0 0'
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  timelineItem: {
    display: 'flex',
    gap: '1rem',
    position: 'relative'
  },
  timelinePointContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '16px',
    flexShrink: 0
  },
  timelinePoint: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    marginTop: '6px',
    zIndex: 2
  },
  timelineLine: {
    width: '2px',
    flexGrow: 1,
    backgroundColor: '#E2E8F0',
    marginTop: '4px',
    marginBottom: '-8px'
  },
  timelineContent: {
    paddingBottom: '1.25rem',
    flex: 1
  },
  timelineMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  logUsuario: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#334155'
  },
  logFecha: {
    fontSize: '0.75rem',
    color: '#94A3B8'
  },
  logDesc: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px'
  },
  logBadge: {
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
  },
  logDetalle: {
    fontSize: '0.825rem',
    color: '#64748B'
  }
};

export default Dashboard;
