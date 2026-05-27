/**
 * AprobacionReservas.jsx
 * ─────────────────────────────────────────────────────────
 * Panel exclusivo del administrador para aprobar/rechazar reservas.
 * 
 * Características optimizadas:
 *  - Integración de **TanStack React Table** para una gestión de datos con ordenación y filtrado.
 *  - Indicador de **Semáforo de Prioridad** animado (Rojo: <72h con pulso animado, Amarillo: <7 días, Verde: >7 días).
 *  - KPIs en tiempo real de reservas.
 *  - Historial detallado con filtrado dinámico.
 */

import { useState, useMemo, useEffect } from 'react';
import { useReservas } from '../hooks/useReservas';
import { useAuth } from '../context/AuthContext';
import EstadoBadge from '../components/ui/EstadoBadge';
import Modal from '../components/ui/Modal';
import { useUIFeedback } from '../context/UIFeedbackContext';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender
} from '@tanstack/react-table';
import {
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowUpDown,
  Search,
  Check,
  X
} from 'lucide-react';

const AprobacionReservas = () => {
  const { profile, user } = useAuth();
  const { showToast } = useUIFeedback();
  const {
    reservas,
    loading,
    fetchReservas,
    aprobarReserva,
    rechazarReserva,
    obtenerReservasPendientes,
    obtenerReservasEsteMes
  } = useReservas();

  // KPIs
  const [kpiPendientes, setKpiPendientes] = useState(0);
  const [kpiAprobadas, setKpiAprobadas] = useState(0);
  const [kpiRechazadas, setKpiRechazadas] = useState(0);

  // Estados locales
  const [tabActual, setTabActual] = useState('pendientes');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Ordenamiento de tabla
  const [sorting, setSorting] = useState([{ id: 'fecha_evento', desc: false }]);

  // Modales
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [isModalDetalleAbierto, setIsModalDetalleAbierto] = useState(false);
  const [reservaRechazar, setReservaRechazar] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [isModalRechazoAbierto, setIsModalRechazoAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Cargar datos
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    await fetchReservas();
    const pendientes = await obtenerReservasPendientes();
    const aprobadas = await obtenerReservasEsteMes();

    setKpiPendientes(pendientes);
    setKpiAprobadas(aprobadas);

    // Calcular rechazadas este mes
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

    const rechazadasEsteMes = (Array.isArray(reservas) ? reservas : []).filter(r =>
      r.estado === 'rechazada' &&
      r.fecha_revision &&
      new Date(r.fecha_revision) >= primerDia &&
      new Date(r.fecha_revision) <= ultimoDia
    ).length;

    setKpiRechazadas(rechazadasEsteMes);
  };

  // Calcular prioridad (Semáforo) según cercanía de la fecha del evento
  const calcularPrioridadSemáforo = (fechaEvento) => {
    const ahora = new Date();
    const fecha = new Date(fechaEvento + 'T12:00:00'); // Forzar mediodía para evitar zonas horarias
    const diferenciaMs = fecha - ahora;
    const diasFaltantes = diferenciaMs / (1000 * 60 * 60 * 24);

    if (diasFaltantes < 0) return { nivel: 'vencida', color: '#64748B', label: 'Realizado/Vencido' };
    if (diasFaltantes <= 3) return { nivel: 'rojo', color: '#EF4444', label: 'Urgente (<72h)' };
    if (diasFaltantes <= 7) return { nivel: 'amarillo', color: '#F59E0B', label: 'Próximo (<7d)' };
    return { nivel: 'verde', color: '#10B981', label: 'Normal (>7d)' };
  };

  // Filtrar reservas pendientes
  const reservasPendientesRaw = useMemo(() => {
    return reservas.filter(r => r.estado === 'pendiente');
  }, [reservas]);

  // Filtrar con texto de búsqueda
  const reservasPendientesFiltradas = useMemo(() => {
    if (!filtroTexto.trim()) return reservasPendientesRaw;
    const query = filtroTexto.toLowerCase();
    return reservasPendientesRaw.filter(r => {
      const nombre = `${r.usuarios?.nombres || ''} ${r.usuarios?.apellidos || ''}`.toLowerCase();
    const apto = (r.usuarios?.numero_apto || '').toLowerCase();
      const tipo = (r.tipo_evento || '').toLowerCase();
      return nombre.includes(query) || apto.includes(query) || tipo.includes(query);
    });
  }, [reservasPendientesRaw, filtroTexto]);

  // Filtrar historial (aprobadas y rechazadas)
  const historialFiltrado = useMemo(() => {
    return reservas.filter(r => {
      if (r.estado === 'pendiente' || r.estado === 'cancelada') return false;

      // Filtro de fecha desde
      if (fechaDesde && new Date(r.fecha_evento) < new Date(fechaDesde)) return false;
      // Filtro de fecha hasta
      if (fechaHasta && new Date(r.fecha_evento) > new Date(fechaHasta)) return false;

      // Filtro por texto de búsqueda
      if (filtroTexto.trim()) {
        const query = filtroTexto.toLowerCase();
        const nombre = `${r.usuarios?.nombres} ${r.usuarios?.apellidos}`.toLowerCase();
        const apto = (r.usuarios?.numero_apto || '').toLowerCase();
        const tipo = (r.tipo_evento || '').toLowerCase();
        return nombre.includes(query) || apto.includes(query) || tipo.includes(query);
      }

      return true;
    });
  }, [reservas, fechaDesde, fechaHasta, filtroTexto]);

  // Definición de columnas de TanStack Table para PENDIENTES
  const columnasPendientes = useMemo(() => [
    {
      id: 'residente',
      header: 'Residente / Apto',
      accessorFn: row => `${row.usuarios?.nombres} ${row.usuarios?.apellidos}`,
      cell: info => {
        const row = info.row.original;
        const nombres = row.usuarios?.nombres || '';
        const apellidos = row.usuarios?.apellidos || '';
        return (
          <div style={styles.residenteCelda}>
            <div style={styles.avatar}>
              {nombres?.charAt(0) || apellidos?.charAt(0)}{apellidos?.charAt(0) || ''}
            </div>
            <div>
              <div style={styles.nombre}>{nombres} {apellidos}</div>
              <div style={styles.apto}>Apto {row.usuarios?.numero_apto || 'N/A'}</div>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'fecha_evento',
      header: ({ column }) => (
        <button style={styles.btnEncabezadoSort} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Fecha Evento <ArrowUpDown size={14} />
        </button>
      ),
      cell: info => {
        const fecha = info.getValue();
        return (
          <span style={{ fontWeight: '600' }}>
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        );
      }
    },
    {
      id: 'horario',
      header: 'Horario',
      cell: info => {
        const row = info.row.original;
        return <span style={styles.horarioBadge}>{row.hora_inicio} - {row.hora_fin}</span>;
      }
    },
    {
      accessorKey: 'tipo_evento',
      header: 'Tipo Evento',
    },
    {
      accessorKey: 'numero_invitados',
      header: 'Invitados',
      cell: info => <span style={{ fontWeight: '700' }}>{info.getValue()}</span>
    },
    {
      id: 'semaforo',
      header: 'Prioridad',
      cell: info => {
        const row = info.row.original;
        const semaforo = calcularPrioridadSemáforo(row.fecha_evento);
        const esUrgente = semaforo.nivel === 'rojo';

        return (
          <div style={styles.semaforoContenedor}>
            <span style={{
              ...styles.semaforoIndicador,
              backgroundColor: semaforo.color,
              animation: esUrgente ? 'pulse-glow 1.5s infinite' : 'none'
            }} />
            <span style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: esUrgente ? '#EF4444' : 'inherit'
            }}>
              {semaforo.label}
            </span>
          </div>
        );
      }
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: info => {
        const row = info.row.original;
        return (
          <div style={styles.acciones}>
            <button
              onClick={() => {
                setReservaSeleccionada(row);
                setIsModalDetalleAbierto(true);
              }}
              style={styles.btnAccionDetalle}
              title="Ver detalle"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={() => handleAprobación(row.id)}
              disabled={procesando}
              style={styles.btnAccionAprobar}
              title="Aprobar"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => handleRechazo(row)}
              disabled={procesando}
              style={styles.btnAccionRechazar}
              title="Rechazar"
            >
              <X size={18} />
            </button>
          </div>
        );
      }
    }
  ], [procesando]);

  // Hook de TanStack Table para pendientes
  const tablePendientes = useReactTable({
    data: reservasPendientesFiltradas,
    columns: columnasPendientes,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  // Handlers
  const handleAprobación = async (reservaId) => {
    setProcesando(true);
    try {
      const resultado = await aprobarReserva(reservaId, user.id);
      if (resultado.success) {
        showToast('Reserva aprobada correctamente.', 'success');
        await cargarDatos();
      } else {
        showToast('Error al aprobar: ' + resultado.error, 'error');
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazo = (reserva) => {
    setReservaRechazar(reserva);
    setMotivoRechazo('');
    setIsModalRechazoAbierto(true);
  };

  const confirmarRechazo = async () => {
    if (!motivoRechazo.trim()) {
      showToast('El motivo de rechazo es obligatorio.', 'warning');
      return;
    }

    setProcesando(true);
    try {
      const resultado = await rechazarReserva(reservaRechazar.id, user.id, motivoRechazo);
      if (resultado.success) {
        showToast('Reserva rechazada correctamente.', 'success');
        await cargarDatos();
        setIsModalRechazoAbierto(false);
        setReservaRechazar(null);
        setMotivoRechazo('');
      } else {
        showToast('Error al rechazar: ' + resultado.error, 'error');
      }
    } finally {
      setProcesando(false);
    }
  };

  if (!['administrador', 'supervisor'].includes(profile?.rol)) {
    return (
      <div style={styles.container}>
        <div style={styles.accesoNegado}>
          <AlertTriangle size={48} color="#EF4444" />
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a este panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.container}>
      {/* Estilos para animación de pulso del semáforo */}
      <style>{`
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            transform: scale(0.95);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
            transform: scale(1.1);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            transform: scale(0.95);
          }
        }
      `}</style>

      {/* Encabezado */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titulo}>Panel de Aprobaciones</h1>
          <p style={styles.subtitulo}>Revisa y toma decisiones sobre solicitudes de reserva del salón social.</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={styles.kpisContenedor}>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcono, backgroundColor: '#FEF3C7' }}>
            <Clock size={24} color="#D97706" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Pendientes</p>
            <p style={styles.kpiValor}>{kpiPendientes}</p>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcono, backgroundColor: '#D1FAE5' }}>
            <CheckCircle size={24} color="#059669" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Aprobadas (Este mes)</p>
            <p style={styles.kpiValor}>{kpiAprobadas}</p>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcono, backgroundColor: '#FEE2E2' }}>
            <XCircle size={24} color="#DC2626" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Rechazadas (Este mes)</p>
            <p style={styles.kpiValor}>{kpiRechazadas}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros de Búsqueda */}
      <div style={styles.barraAcciones}>
        <div style={styles.tabs}>
          <button
            onClick={() => setTabActual('pendientes')}
            style={{
              ...styles.tab,
              borderBottom: tabActual === 'pendientes' ? '3px solid #2563EB' : '3px solid transparent',
              color: tabActual === 'pendientes' ? '#2563EB' : '#64748B'
            }}
          >
            Pendientes ({reservasPendientesFiltradas.length})
          </button>
          <button
            onClick={() => setTabActual('historial')}
            style={{
              ...styles.tab,
              borderBottom: tabActual === 'historial' ? '3px solid #2563EB' : '3px solid transparent',
              color: tabActual === 'historial' ? '#2563EB' : '#64748B'
            }}
          >
            Historial
          </button>
        </div>

        <div style={styles.buscador}>
          <Search size={18} color="#64748B" />
          <input
            type="text"
            placeholder="Buscar por residente o apto..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={styles.buscadorInput}
          />
        </div>
      </div>

      {/* Contenido TAB: Pendientes (TanStack Table) */}
      {tabActual === 'pendientes' && (
        <div style={styles.cajaContenido}>
          {loading ? (
            <div style={styles.cargando}>Cargando reservas...</div>
          ) : reservasPendientesFiltradas.length === 0 ? (
            <div style={styles.sinResultados}>
              <CheckCircle size={48} color="#10B981" />
              <p>No se encontraron reservas pendientes de revisión</p>
            </div>
          ) : (
            <div style={styles.tablaContenedor}>
              <table style={styles.tabla}>
                <thead>
                  {tablePendientes.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} style={styles.filaEncabezado}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} style={styles.celdaEncabezado}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {tablePendientes.getRowModel().rows.map(row => (
                    <tr key={row.id} style={styles.fila}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={styles.celda}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Contenido TAB: Historial */}
      {tabActual === 'historial' && (
        <div style={styles.cajaContenido}>
          {/* Filtros de Historial */}
          <div style={styles.filtrosHistorial}>
            <div>
              <label style={styles.labelFiltro}>Filtrar desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={styles.inputFiltro}
              />
            </div>
            <div>
              <label style={styles.labelFiltro}>Filtrar hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={styles.inputFiltro}
              />
            </div>
          </div>

          {loading ? (
            <div style={styles.cargando}>Cargando historial...</div>
          ) : historialFiltrado.length === 0 ? (
            <div style={styles.sinResultados}>
              <TrendingUp size={48} color="#CBD5E1" />
              <p>No hay historial de decisiones en este rango de fechas</p>
            </div>
          ) : (
            <div style={styles.tablaContenedor}>
              <table style={styles.tabla}>
                <thead>
                  <tr style={styles.filaEncabezado}>
                    <th style={styles.celdaEncabezado}>Residente / Apto</th>
                    <th style={styles.celdaEncabezado}>Fecha Evento</th>
                    <th style={styles.celdaEncabezado}>Decisión</th>
                    <th style={styles.celdaEncabezado}>Revisor</th>
                    <th style={styles.celdaEncabezado}>Fecha Decisión</th>
                    <th style={styles.celdaEncabezado}>Detalle / Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {historialFiltrado.map(reserva => (
                    <tr key={reserva.id} style={styles.fila}>
                      <td style={styles.celda}>
                        <div style={styles.residenteCelda}>
                          <div style={{ ...styles.avatar, backgroundColor: '#F1F5F9', color: '#64748B' }}>
                            {reserva.usuarios?.nombres?.charAt(0)}{reserva.usuarios?.apellidos?.charAt(0)}
                          </div>
                          <div>
                            <p style={styles.nombreResidente}>
                              {reserva.usuarios?.nombres} {reserva.usuarios?.apellidos}
                            </p>
                            <p style={styles.apto}>Apartamento {reserva.usuarios?.numero_apto}</p>
                          </div>
                        </div>
                      </td>
                      <td style={styles.celda}>
                        <span style={{ fontWeight: '600' }}>
                          {new Date(reserva.fecha_evento + 'T12:00:00').toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      <td style={styles.celda}>
                        <EstadoBadge estado={reserva.estado} />
                      </td>
                      <td style={styles.celda}>
                        {reserva.revisado_por_user?.nombres || 'Sistema'}
                      </td>
                      <td style={styles.celda}>
                        {reserva.fecha_revision
                          ? new Date(reserva.fecha_revision).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td style={styles.celda}>
                        {reserva.motivo_rechazo ? (
                          <span style={styles.motivoRechazo}>{reserva.motivo_rechazo}</span>
                        ) : (
                          <span style={{ color: '#64748B', fontStyle: 'italic' }}>Sin observaciones</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalle */}
      {isModalDetalleAbierto && reservaSeleccionada && (
        <Modal isOpen={isModalDetalleAbierto} onClose={() => setIsModalDetalleAbierto(false)}>
          <div style={styles.modalContenido}>
            <h2 style={styles.modalTitulo}>Detalle Completo de la Reserva</h2>

            <div style={styles.detalleGrid}>
              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Residente:</span>
                <span style={styles.detalleValor}>
                  {reservaSeleccionada.usuarios?.nombres} {reservaSeleccionada.usuarios?.apellidos}
                </span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Apartamento:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.numero_apto || 'N/A'}</span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Correo Electrónico:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.email}</span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Teléfono:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.telefono || 'No registrado'}</span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Fecha del Evento:</span>
                <span style={styles.detalleValor}>
                  {new Date(reservaSeleccionada.fecha_evento + 'T12:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Hora del Evento:</span>
                <span style={styles.detalleValor}>
                  {reservaSeleccionada.hora_inicio} - {reservaSeleccionada.hora_fin}
                </span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Tipo de Evento:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.tipo_evento}</span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Cantidad de Invitados:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.numero_invitados} personas</span>
              </div>

              {reservaSeleccionada.descripcion && (
                <div style={{ ...styles.detalleItem, gridColumn: 'span 2' }}>
                  <span style={styles.detalleLabel}>Notas / Descripción:</span>
                  <span style={styles.detalleValor}>{reservaSeleccionada.descripcion}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsModalDetalleAbierto(false)}
              style={styles.btnCerrarModal}
            >
              Cerrar Vista
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de Rechazo */}
      {isModalRechazoAbierto && reservaRechazar && (
        <Modal isOpen={isModalRechazoAbierto} onClose={() => setIsModalRechazoAbierto(false)}>
          <div style={styles.modalContenido}>
            <h2 style={styles.modalTitulo}>Rechazar Solicitud de Reserva</h2>
            <p style={styles.modalDescripcion}>
              Indique los motivos para rechazar la reserva de <strong>{reservaRechazar.usuarios?.nombres}</strong> del{' '}
              <strong>{new Date(reservaRechazar.fecha_evento + 'T12:00:00').toLocaleDateString()}</strong>.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={styles.labelFiltro}>Motivo del Rechazo *</label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Indique el motivo claramente. El residente podrá ver esta observación..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.botonesModal}>
              <button
                onClick={() => setIsModalRechazoAbierto(false)}
                style={styles.btnModalCancelar}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRechazo}
                disabled={procesando || !motivoRechazo.trim()}
                style={{
                  ...styles.btnModalConfirmar,
                  opacity: procesando || !motivoRechazo.trim() ? 0.6 : 1,
                  cursor: procesando || !motivoRechazo.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {procesando ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </Modal>
      )}
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
    marginBottom: '2rem'
  },
  titulo: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1E293B',
    margin: 0
  },
  subtitulo: {
    fontSize: '0.95rem',
    color: '#64748B',
    margin: '0.5rem 0 0 0'
  },
  accesoNegado: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6rem 2rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '1rem',
    border: '1px solid #E2E8F0',
    textAlign: 'center',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
  },
  kpisContenedor: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  kpiCard: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '1rem',
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
  },
  kpiIcono: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0
  },
  kpiValor: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1E293B',
    margin: 0
  },
  barraAcciones: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #E2E8F0',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  tabs: {
    display: 'flex',
    gap: '1.5rem'
  },
  tab: {
    padding: '1rem 0.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.2s'
  },
  buscador: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '0.75rem',
    padding: '0.5rem 1rem',
    width: '320px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  },
  buscadorInput: {
    border: 'none',
    outline: 'none',
    fontSize: '0.875rem',
    width: '100%',
    fontFamily: 'inherit'
  },
  cajaContenido: {
    backgroundColor: '#FFFFFF',
    borderRadius: '1rem',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)'
  },
  cargando: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748B',
    fontWeight: '600'
  },
  sinResultados: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: '#64748B',
    gap: '1rem'
  },
  filtrosHistorial: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap'
  },
  labelFiltro: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1E293B',
    display: 'block',
    marginBottom: '0.5rem'
  },
  inputFiltro: {
    padding: '0.625rem',
    borderRadius: '0.5rem',
    border: '1px solid #E2E8F0',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    backgroundColor: '#F8FAFC'
  },
  tablaContenedor: {
    overflowX: 'auto'
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  filaEncabezado: {
    backgroundColor: '#F8FAFC'
  },
  celdaEncabezado: {
    padding: '1rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #E2E8F0'
  },
  btnEncabezadoSort: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    color: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  fila: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#F8FAFC'
    }
  },
  celda: {
    padding: '1.25rem 1rem',
    fontSize: '0.875rem',
    color: '#1E293B',
    verticalAlign: 'middle'
  },
  residenteCelda: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: '#EFF6FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    color: '#2563EB',
    fontSize: '0.9rem'
  },
  nombreResidente: {
    fontWeight: '700',
    margin: 0
  },
  apto: {
    fontSize: '0.75rem',
    color: '#64748B',
    margin: '0.15rem 0 0 0',
    fontWeight: '600'
  },
  horarioBadge: {
    backgroundColor: '#F1F5F9',
    color: '#334155',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.8rem'
  },
  semaforoContenedor: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  semaforoIndicador: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  motivoRechazo: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  acciones: {
    display: 'flex',
    gap: '0.5rem'
  },
  btnAccionDetalle: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#4F46E5',
      color: '#FFFFFF'
    }
  },
  btnAccionAprobar: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#059669',
      color: '#FFFFFF'
    }
  },
  btnAccionRechazar: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#DC2626',
      color: '#FFFFFF'
    }
  },
  modalContenido: {
    padding: '2rem'
  },
  modalTitulo: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#1E293B',
    margin: '0 0 1.5rem 0'
  },
  modalDescripcion: {
    color: '#64748B',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    lineHeight: '1.5'
  },
  detalleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
    marginBottom: '1.5rem'
  },
  detalleItem: {
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #E2E8F0'
  },
  detalleLabel: {
    fontWeight: '700',
    color: '#475569',
    display: 'block',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem'
  },
  detalleValor: {
    color: '#1E293B',
    fontWeight: '600'
  },
  textarea: {
    width: '100%',
    minHeight: '110px',
    padding: '0.85rem',
    borderRadius: '0.5rem',
    border: '1px solid #E2E8F0',
    fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: '#2563EB'
    }
  },
  botonesModal: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  btnModalCancelar: {
    backgroundColor: '#F1F5F9',
    color: '#1E293B',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    fontWeight: '700'
  },
  btnModalConfirmar: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700'
  },
  btnCerrarModal: {
    width: '100%',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    marginTop: '1.5rem',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#1D4ED8'
    }
  }
};

export default AprobacionReservas;
