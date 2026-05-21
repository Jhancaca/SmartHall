/**
 * ControlAcceso.jsx
 * ─────────────────────────────────────────────────────────
 * Panel de Control de Acceso y Check-in digital para el Supervisor y Portería.
 * 
 * Características Premium:
 *  - Optimizado para pantallas táctiles y móviles de portería.
 *  - Carga inteligente de invitados agendados para HOY en tiempo real (refetchInterval TanStack Query).
 *  - Panel de Aforo del Día: Monitoreo gráfico interactivo de ingresos en caliente.
 *  - Buscador global predictivo de invitados por documento o nombre.
 *  - Registro ágil de check-in / check-out con estampa de fecha y hora exacta.
 *  - Diseño refinado, estructurado y de alto impacto visual.
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInvitados } from '../hooks/useInvitados';
import {
  ShieldCheck,
  Search,
  UserCheck,
  UserMinus,
  Clock,
  Home,
  CheckCircle,
  Users,
  AlertTriangle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

const ControlAcceso = () => {
  const { profile } = useAuth();
  
  // Estados Locales
  const [filtroTexto, setFiltroTexto] = useState('');
  const [mensajeLocal, setMensajeLocal] = useState({ tipo: '', texto: '' });

  // Hook de Invitados (sin ID de reserva específico, usaremos obtenerInvitadosDeHoy)
  const { obtenerInvitadosDeHoy, registrarCheckIn, registrando } = useInvitados();

  // Obtener la query de TanStack Query
  const {
    data: invitadosHoy = [],
    isLoading: cargandoInvitados,
    refetch: recargarInvitados,
    isFetching
  } = obtenerInvitadosDeHoy();

  // ────────────────────────────────────────────────────────
  // 1. Cálculos de Aforo en Tiempo Real (HOY)
  // ────────────────────────────────────────────────────────

  const aforoHoy = useMemo(() => {
    const total = invitadosHoy.length;
    const ingresados = invitadosHoy.filter(i => i.estado_acceso === 'ingresado').length;
    const pendientes = total - ingresados;
    
    return {
      total,
      ingresados,
      pendientes
    };
  }, [invitadosHoy]);

  // ────────────────────────────────────────────────────────
  // 2. Filtrado de Invitados
  // ────────────────────────────────────────────────────────

  const invitadosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return invitadosHoy;
    const query = filtroTexto.toLowerCase();
    
    return invitadosHoy.filter(inv => {
      const nombre = (inv.nombre_completo || '').toLowerCase();
      const doc = (inv.documento_identidad || '').toLowerCase();
      const residente = `${inv.reserva?.usuarios?.nombres || ''} ${inv.reserva?.usuarios?.apellidos || ''}`.toLowerCase();
      const apto = (inv.reserva?.usuarios?.numero_apto || '').toLowerCase();
      
      return nombre.includes(query) || doc.includes(query) || residente.includes(query) || apto.includes(query);
    });
  }, [invitadosHoy, filtroTexto]);

  // ────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────

  const handleCheckIn = async (invitadoId, estadoIngreso) => {
    setMensajeLocal({ tipo: '', texto: '' });
    try {
      await registrarCheckIn({
        invitadoId,
        estado: estadoIngreso
      });
      setMensajeLocal({
        tipo: 'success',
        texto: estadoIngreso === 'ingresado' ? 'Ingreso registrado con éxito.' : 'Ingreso cancelado/salida registrada.'
      });
      setTimeout(() => setMensajeLocal({ tipo: '', texto: '' }), 3000);
    } catch (err) {
      setMensajeLocal({
        tipo: 'error',
        texto: err.message || 'Error al procesar el check-in.'
      });
    }
  };

  // Solo personal de portería (supervisor) o administrador puede registrar ingresos
  if (!['administrador', 'supervisor'].includes(profile?.rol)) {
    return (
      <div style={styles.accesoNegadoContainer}>
        <div style={styles.accesoNegadoCard}>
          <AlertTriangle size={48} color="var(--danger)" />
          <h2>Acceso Denegado</h2>
          <p>Esta sección es exclusiva para el personal de portería, supervisores o administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.container}>
      
      {/* Cabecera */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.logoBadge}>
            <ShieldCheck size={24} color="#FFFFFF" />
          </div>
          <div>
            <h1 style={styles.titulo}>Control de Acceso (Check-in Portería)</h1>
            <p style={styles.subtitulo}>Verifica el ingreso de invitados de residentes registrados para el día de hoy.</p>
          </div>
        </div>

        <button onClick={() => recargarInvitados()} style={styles.btnSync} title="Sincronizar ahora">
          <RefreshCw size={16} className={isFetching ? 'spin' : ''} />
          Sincronizar
        </button>
      </header>

      {/* Panel de Aforo / Dashboard de Portería */}
      <section style={styles.aforoGrid}>
        
        {/* KPI: Invitados Esperados */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <Users size={22} color="#3B82F6" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Aforo Esperado Hoy</p>
            <h2 style={{ ...styles.kpiValue, color: '#1E293B' }}>{aforoHoy.total}</h2>
            <p style={styles.kpiSub}>Total programados</p>
          </div>
        </div>

        {/* KPI: Invitados Ingresados */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <UserCheck size={22} color="#10B981" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Aforo Ingresado</p>
            <h2 style={{ ...styles.kpiValue, color: '#10B981' }}>{aforoHoy.ingresados}</h2>
            <p style={styles.kpiSub}>Dentro del salón social</p>
          </div>
        </div>

        {/* KPI: Invitados Pendientes */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <Clock size={22} color="#F59E0B" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Pendientes de Ingreso</p>
            <h2 style={{ ...styles.kpiValue, color: '#F59E0B' }}>{aforoHoy.pendientes}</h2>
            <p style={styles.kpiSub}>Aún por llegar</p>
          </div>
        </div>
      </section>

      {/* Alertas locales */}
      {mensajeLocal.texto && (
        <div style={{
          ...styles.alerta,
          backgroundColor: mensajeLocal.tipo === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: mensajeLocal.tipo === 'success' ? '#059669' : '#DC2626',
          borderColor: mensajeLocal.tipo === 'success' ? '#A7F3D0' : '#FCA5A5'
        }}>
          {mensajeLocal.tipo === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{mensajeLocal.texto}</span>
        </div>
      )}

      {/* Filtro y Buscador predictivo */}
      <section style={styles.filtroCard}>
        <div style={styles.buscadorWrapper}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar invitado por documento, nombre o residente asociado..."
            value={filtroTexto}
            onChange={e => setFiltroTexto(e.target.value)}
            style={styles.buscadorInput}
          />
        </div>
      </section>

      {/* Listado Principal de Portería */}
      <main style={styles.tablaCard}>
        {cargandoInvitados ? (
          <div style={styles.cargandoContenedor}>
            <div className="spinner" style={styles.spinner} />
            <p>Compilando lista de ingresos de hoy...</p>
          </div>
        ) : invitadosFiltrados.length === 0 ? (
          <div style={styles.sinResultados}>
            <Users size={48} color="#94A3B8" />
            <h3>No se encontraron invitados agendados</h3>
            <p>
              {filtroTexto.trim()
                ? 'Prueba modificando los términos del buscador predictivo.'
                : 'No hay eventos aprobados programados para el día de hoy.'}
            </p>
          </div>
        ) : (
          <div style={styles.tablaWrapper}>
            <table style={styles.tabla}>
              <thead>
                <tr style={styles.filaEncabezado}>
                  <th style={styles.celdaEncabezado}>Invitado</th>
                  <th style={styles.celdaEncabezado}>Documento</th>
                  <th style={styles.celdaEncabezado}>Residente / Apto</th>
                  <th style={styles.celdaEncabezado}>Evento / Reserva</th>
                  <th style={styles.celdaEncabezado}>Hora Ingreso</th>
                  <th style={{ ...styles.celdaEncabezado, textAlign: 'center' }}>Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody>
                {invitadosFiltrados.map(inv => {
                  const yaIngreso = inv.estado_acceso === 'ingresado';
                  return (
                    <tr key={inv.id} style={{
                      ...styles.fila,
                      backgroundColor: yaIngreso ? '#F0FDF4' : 'transparent'
                    }}>
                      <td style={styles.celda}>
                        <div style={styles.celdaDobleLine}>
                          <span style={{ ...styles.lineaPrincipal, fontWeight: '700' }}>{inv.nombre_completo}</span>
                          <span style={styles.lineaSecundaria}>Registro digital de acceso</span>
                        </div>
                      </td>
                      <td style={styles.celda}>
                        <span style={styles.documentoText}>{inv.documento_identidad}</span>
                      </td>
                      <td style={styles.celda}>
                        <div style={styles.celdaDobleLine}>
                          <span style={styles.lineaPrincipal}>
                            {inv.reserva?.usuarios?.nombres} {inv.reserva?.usuarios?.apellidos}
                          </span>
                          <span style={{ ...styles.lineaSecundaria, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Home size={12} /> Apto {inv.reserva?.usuarios?.numero_apto}
                          </span>
                        </div>
                      </td>
                      <td style={styles.celda}>
                        <span style={styles.eventoText}>{inv.reserva?.tipo_evento || 'Salón Social'}</span>
                      </td>
                      <td style={styles.celda}>
                        {inv.ingresado_a_las ? (
                          <div style={{ ...styles.celdaDobleLine, color: '#059669' }}>
                            <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Ingresó
                            </span>
                            <span style={styles.lineaSecundaria}>
                              {new Date(inv.ingresado_a_las).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#64748B', fontStyle: 'italic' }}>Sin ingresar</span>
                        )}
                      </td>
                      <td style={{ ...styles.celda, textAlign: 'center' }}>
                        <div style={styles.accionesFlex}>
                          {!yaIngreso ? (
                            <button
                              onClick={() => handleCheckIn(inv.id, 'ingresado')}
                              disabled={registrando}
                              style={styles.btnCheckIn}
                            >
                              <UserCheck size={16} />
                              Dar Ingreso
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(inv.id, 'pendiente')}
                              disabled={registrando}
                              style={styles.btnCheckOut}
                            >
                              <UserMinus size={16} />
                              Deshacer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Keyframes de CSS animado */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1.5s linear infinite;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #E2E8F0;
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
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
  logoBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '10px',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
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
  btnSync: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '42px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '10px',
    padding: '0 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    ':hover': {
      backgroundColor: '#F8FAFC',
      color: 'var(--primary)'
    }
  },
  aforoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  },
  kpiIcon: {
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
  alerta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '1.5rem'
  },
  filtroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '1rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  },
  buscadorWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    height: '44px',
    padding: '0 1rem',
    gap: '10px'
  },
  buscadorInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    backgroundColor: 'transparent',
    fontSize: '0.9rem',
    color: '#0F172A'
  },
  tablaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },
  cargandoContenedor: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6rem 0',
    gap: '1rem',
    color: '#64748B'
  },
  sinResultados: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6rem 2rem',
    textAlign: 'center',
    color: '#64748B',
    gap: '0.5rem'
  },
  tablaWrapper: {
    overflowX: 'auto'
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  filaEncabezado: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0'
  },
  celdaEncabezado: {
    padding: '1rem 1.5rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  fila: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.2s'
  },
  celda: {
    padding: '1.25rem 1.5rem',
    fontSize: '0.875rem',
    color: '#334155'
  },
  celdaDobleLine: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  lineaPrincipal: {
    fontWeight: '600',
    color: '#0F172A'
  },
  lineaSecundaria: {
    fontSize: '0.75rem',
    color: '#64748B'
  },
  documentoText: {
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'monospace',
    fontSize: '0.95rem'
  },
  eventoText: {
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  accionesFlex: {
    display: 'flex',
    justifyContent: 'center'
  },
  btnCheckIn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '0.825rem',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px 0 rgba(16, 185, 129, 0.1)',
    ':hover': {
      backgroundColor: '#059669'
    }
  },
  btnCheckOut: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#64748B',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '0.825rem',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#475569'
    }
  },
  accesoNegadoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '2rem'
  },
  accesoNegadoCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '16px',
    padding: '3rem 2rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  }
};

export default ControlAcceso;
