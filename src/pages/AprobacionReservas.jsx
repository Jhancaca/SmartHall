/**
 * AprobacionReservas.jsx
 * ─────────────────────────────────────────────────────────
 * Panel exclusivo del administrador para aprobar/rechazar reservas.
 * 
 * Características:
 *  - Tabla de reservas pendientes con botones Aprobar y Rechazar
 *  - KPI: total pendientes, aprobadas este mes, rechazadas este mes
 *  - Tab "Historial": reservas ya procesadas con filtro de fechas
 *  - Modal para ingresar motivo de rechazo
 */

import { useState, useEffect } from 'react';
import { useReservas } from '../hooks/useReservas';
import { useAuth } from '../context/AuthContext';
import EstadoBadge from '../components/ui/EstadoBadge';
import Modal from '../components/ui/Modal';
import { CheckCircle, XCircle, Eye, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

const AprobacionReservas = () => {
    const { profile, user } = useAuth();
    const {
        reservas,
        loading,
        fetchReservas,
        aprobarReserva,
        rechazarReserva,
        obtenerReservasPendientes,
        obtenerReservasEsteMes
    } = useReservas();

    // KPI
    const [kpiPendientes, setKpiPendientes] = useState(0);
    const [kpiAprobadas, setKpiAprobadas] = useState(0);
    const [kpiRechazadas, setKpiRechazadas] = useState(0);

    // Tabs
    const [tabActual, setTabActual] = useState('pendientes');

    // Filtros del Historial
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    // Modal de detalle
    const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
    const [isModalDetalleAbierto, setIsModalDetalleAbierto] = useState(false);

    // Modal de rechazo
    const [reservaRechazar, setReservaRechazar] = useState(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [isModalRechazoAbierto, setIsModalRechazoAbierto] = useState(false);
    const [procesando, setProcesando] = useState(false);

    // Cargar datos iniciales
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

    // Filtrar reservas pendientes
    const reservasPendientes = reservas.filter(r => r.estado === 'pendiente');

    // Filtrar historial (aprobadas y rechazadas)
    const historialFiltrado = reservas.filter(r => {
        if (r.estado === 'pendiente' || r.estado === 'cancelada') return false;

        if (fechaDesde && new Date(r.fecha_revision) < new Date(fechaDesde)) return false;
        if (fechaHasta && new Date(r.fecha_revision) > new Date(fechaHasta)) return false;

        return true;
    });

    // Handlers
    const handleAprobación = async (reservaId) => {
        setProcesando(true);
        try {
            const resultado = await aprobarReserva(reservaId, user.id);
            if (resultado.success) {
                await cargarDatos();
            } else {
                alert('Error al aprobar: ' + resultado.error);
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
            alert('El motivo de rechazo es obligatorio.');
            return;
        }

        setProcesando(true);
        try {
            const resultado = await rechazarReserva(reservaRechazar.id, user.id, motivoRechazo);
            if (resultado.success) {
                await cargarDatos();
                setIsModalRechazoAbierto(false);
                setReservaRechazar(null);
                setMotivoRechazo('');
            } else {
                alert('Error al rechazar: ' + resultado.error);
            }
        } finally {
            setProcesando(false);
        }
    };

    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatearFechaHora = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
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
        <div style={styles.container}>
            {/* Encabezado */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.titulo}>Panel de Aprobaciones</h1>
                    <p style={styles.subtitulo}>Revisa y aprueba las solicitudes de reserva del salón</p>
                </div>
            </div>

            {/* KPIs */}
            <div style={styles.kpisContenedor}>
                <div style={styles.kpi}>
                    <div style={styles.kpiIcono}>
                        <Clock size={24} color="#F59E0B" />
                    </div>
                    <div>
                        <p style={styles.kpiLabel}>Pendientes</p>
                        <p style={styles.kpiValor}>{kpiPendientes}</p>
                    </div>
                </div>

                <div style={styles.kpi}>
                    <div style={styles.kpiIcono}>
                        <CheckCircle size={24} color="#10B981" />
                    </div>
                    <div>
                        <p style={styles.kpiLabel}>Aprobadas (Este mes)</p>
                        <p style={styles.kpiValor}>{kpiAprobadas}</p>
                    </div>
                </div>

                <div style={styles.kpi}>
                    <div style={styles.kpiIcono}>
                        <XCircle size={24} color="#EF4444" />
                    </div>
                    <div>
                        <p style={styles.kpiLabel}>Rechazadas (Este mes)</p>
                        <p style={styles.kpiValor}>{kpiRechazadas}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    onClick={() => setTabActual('pendientes')}
                    style={{
                        ...styles.tab,
                        borderBottom: tabActual === 'pendientes' ? '2px solid #2563EB' : '2px solid transparent',
                        color: tabActual === 'pendientes' ? '#2563EB' : '#64748B'
                    }}
                >
                    Pendientes ({reservasPendientes.length})
                </button>
                <button
                    onClick={() => setTabActual('historial')}
                    style={{
                        ...styles.tab,
                        borderBottom: tabActual === 'historial' ? '2px solid #2563EB' : '2px solid transparent',
                        color: tabActual === 'historial' ? '#2563EB' : '#64748B'
                    }}
                >
                    Historial
                </button>
            </div>

            {/* Contenido TAB: Pendientes */}
            {tabActual === 'pendientes' && (
                <div style={styles.tabContenido}>
                    {loading ? (
                        <div style={styles.cargando}>Cargando...</div>
                    ) : reservasPendientes.length === 0 ? (
                        <div style={styles.sinResultados}>
                            <CheckCircle size={48} color="#10B981" />
                            <p>No hay reservas pendientes de revisión</p>
                        </div>
                    ) : (
                        <div style={styles.tablaContenedor}>
                            <table style={styles.tabla}>
                                <thead>
                                    <tr style={styles.filaEncabezado}>
                                        <th style={styles.celdaEncabezado}>Residente / Apto</th>
                                        <th style={styles.celdaEncabezado}>Fecha del Evento</th>
                                        <th style={styles.celdaEncabezado}>Horario</th>
                                        <th style={styles.celdaEncabezado}>Tipo de Evento</th>
                                        <th style={styles.celdaEncabezado}>Invitados</th>
                                        <th style={styles.celdaEncabezado}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservasPendientes.map(reserva => (
                                        <tr key={reserva.id} style={styles.fila}>
                                            <td style={styles.celda}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={styles.avatar}>
                                                        {reserva.usuarios?.nombres?.charAt(0)}{reserva.usuarios?.apellidos?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p style={styles.nombreResidente}>
                                                            {reserva.usuarios?.nombres} {reserva.usuarios?.apellidos}
                                                        </p>
                                                        <p style={styles.apto}>{reserva.usuarios?.numero_apto}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={styles.celda}>{formatearFecha(reserva.fecha_evento)}</td>
                                            <td style={styles.celda}>
                                                {reserva.hora_inicio} - {reserva.hora_fin}
                                            </td>
                                            <td style={styles.celda}>{reserva.tipo_evento}</td>
                                            <td style={styles.celda}>{reserva.numero_invitados}</td>
                                            <td style={styles.celda}>
                                                <div style={styles.acciones}>
                                                    <button
                                                        onClick={() => {
                                                            setReservaSeleccionada(reserva);
                                                            setIsModalDetalleAbierto(true);
                                                        }}
                                                        style={styles.botonAccion}
                                                        title="Ver detalle"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAprobación(reserva.id)}
                                                        disabled={procesando}
                                                        style={{ ...styles.botonAccion, color: '#10B981' }}
                                                        title="Aprobar"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRechazo(reserva)}
                                                        disabled={procesando}
                                                        style={{ ...styles.botonAccion, color: '#EF4444' }}
                                                        title="Rechazar"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            </td>
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
                <div style={styles.tabContenido}>
                    {/* Filtros */}
                    <div style={styles.filtrosHistorial}>
                        <div>
                            <label style={styles.labelFiltro}>Desde</label>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                style={styles.inputFiltro}
                            />
                        </div>
                        <div>
                            <label style={styles.labelFiltro}>Hasta</label>
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                style={styles.inputFiltro}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={styles.cargando}>Cargando...</div>
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
                                        <th style={styles.celdaEncabezado}>Residente</th>
                                        <th style={styles.celdaEncabezado}>Fecha del Evento</th>
                                        <th style={styles.celdaEncabezado}>Decisión</th>
                                        <th style={styles.celdaEncabezado}>Revisado por</th>
                                        <th style={styles.celdaEncabezado}>Fecha de Revisión</th>
                                        <th style={styles.celdaEncabezado}>Motivo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historialFiltrado.map(reserva => (
                                        <tr key={reserva.id} style={styles.fila}>
                                            <td style={styles.celda}>
                                                <div>
                                                    <p style={styles.nombreResidente}>
                                                        {reserva.usuarios?.nombres} {reserva.usuarios?.apellidos}
                                                    </p>
                                                    <p style={styles.apto}>{reserva.usuarios?.numero_apto}</p>
                                                </div>
                                            </td>
                                            <td style={styles.celda}>{formatearFecha(reserva.fecha_evento)}</td>
                                            <td style={styles.celda}>
                                                <EstadoBadge estado={reserva.estado} />
                                            </td>
                                            <td style={styles.celda}>
                                                {reserva.revisado_por_user?.nombres || 'N/A'}
                                            </td>
                                            <td style={styles.celda}>
                                                {formatearFechaHora(reserva.fecha_revision)}
                                            </td>
                                            <td style={styles.celda}>
                                                {reserva.motivo_rechazo ? (
                                                    <span style={styles.motivoRechazo}>{reserva.motivo_rechazo}</span>
                                                ) : (
                                                    '-'
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
                        <h2 style={styles.modalTitulo}>Detalle de Reserva</h2>

                        <div style={styles.detalleGrid}>
                            <div style={styles.detalleItem}>
                                <span style={styles.detalleLabel}>Residente:</span>
                                <span style={styles.detalleValor}>
                                    {reservaSeleccionada.usuarios?.nombres} {reservaSeleccionada.usuarios?.apellidos}
                                </span>
                            </div>

                            <div style={styles.detalleItem}>
                                <span style={styles.detalleLabel}>Apartamento:</span>
                                <span style={styles.detalleValor}>{reservaSeleccionada.usuarios.numero_apto}</span>
                            </div>

                            <div style={styles.detalleItem}>
                                <span style={styles.detalleLabel}>Email:</span>
                                <span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.email}</span>
                            </div>

                            <div style={styles.detalleItem}>
                                <span style={styles.detalleLabel}>Fecha del Evento:</span>
                                <span style={styles.detalleValor}>
                                    {formatearFecha(reservaSeleccionada.fecha_evento)}
                                </span>
                            </div>

                            <div style={styles.detalleItem}>
                                <span style={styles.detalleLabel}>Horario:</span>
                                <span style={styles.detalleValor}>
                                    {reservaSeleccionada.hora_inicio} - {reservaSeleccionada.hora_fin}
                                </span>
                            </div>

                            <div style={styles.detalleItem}>
                                <span style={styles.detalleLabel}>Tipo de Evento:</span>
                                <span style={styles.detalleValor}>{reservaSeleccionada.tipo_evento}</span>
                            </div>

                            <div style={styles.detalleItem}>
                                <span style={styles.detalleLabel}>Número de Invitados:</span>
                                <span style={styles.detalleValor}>{reservaSeleccionada.numero_invitados}</span>
                            </div>

                            {reservaSeleccionada.descripcion && (
                                <div style={styles.detalleItem}>
                                    <span style={styles.detalleLabel}>Descripción:</span>
                                    <span style={styles.detalleValor}>{reservaSeleccionada.descripcion}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsModalDetalleAbierto(false)}
                            style={styles.botonCerrarModal}
                        >
                            Cerrar
                        </button>
                    </div>
                </Modal>
            )}

            {/* Modal de Rechazo */}
            {isModalRechazoAbierto && reservaRechazar && (
                <Modal isOpen={isModalRechazoAbierto} onClose={() => setIsModalRechazoAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <h2 style={styles.modalTitulo}>Rechazar Reserva</h2>
                        <p style={styles.modalDescripcion}>
                            Reserva de {reservaRechazar.usuarios.nombres} para el{' '}
                            {formatearFecha(reservaRechazar.fecha_evento)}
                        </p>

                        <div style={styles.grupoFormulario}>
                            <label style={styles.label}>Motivo del Rechazo *</label>
                            <textarea
                                value={motivoRechazo}
                                onChange={(e) => setMotivoRechazo(e.target.value)}
                                placeholder="Explica por qué se rechaza esta reserva"
                                style={styles.textarea}
                            />
                        </div>

                        <div style={styles.botonesModal}>
                            <button
                                onClick={() => setIsModalRechazoAbierto(false)}
                                style={styles.botonModalSecundario}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarRechazo}
                                disabled={procesando || !motivoRechazo.trim()}
                                style={{
                                    ...styles.botonModalPrimario,
                                    opacity: procesando || !motivoRechazo.trim() ? 0.6 : 1,
                                    cursor: procesando || !motivoRechazo.trim() ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {procesando ? 'Rechazando...' : 'Rechazar'}
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
        padding: '2rem'
    },
    header: {
        marginBottom: '2rem'
    },
    titulo: {
        fontSize: '1.875rem',
        fontWeight: '700',
        color: '#1E293B',
        margin: 0
    },
    subtitulo: {
        fontSize: '0.875rem',
        color: '#64748B',
        margin: '0.5rem 0 0 0'
    },
    accesoNegado: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        backgroundColor: '#FFFFFF',
        borderRadius: '0.5rem',
        border: '1px solid #E2E8F0',
        textAlign: 'center',
        color: '#1E293B'
    },
    kpisContenedor: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
    },
    kpi: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #E2E8F0'
    },
    kpiIcono: {
        width: '56px',
        height: '56px',
        backgroundColor: '#F1F5F9',
        borderRadius: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    kpiLabel: {
        fontSize: '0.875rem',
        color: '#64748B',
        margin: 0
    },
    kpiValor: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#1E293B',
        margin: 0
    },
    tabs: {
        display: 'flex',
        gap: '2rem',
        borderBottom: '1px solid #E2E8F0',
        marginBottom: '2rem'
    },
    tab: {
        padding: '1rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        transition: 'color 0.2s'
    },
    tabContenido: {
        backgroundColor: '#FFFFFF',
        borderRadius: '0.5rem',
        border: '1px solid #E2E8F0',
        padding: '1.5rem'
    },
    cargando: {
        textAlign: 'center',
        padding: '2rem',
        color: '#64748B'
    },
    sinResultados: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
        color: '#64748B'
    },
    filtrosHistorial: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
    },
    labelFiltro: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#1E293B',
        display: 'block',
        marginBottom: '0.5rem'
    },
    inputFiltro: {
        width: '100%',
        padding: '0.625rem',
        borderRadius: '0.375rem',
        border: '1px solid #E2E8F0',
        fontSize: '0.875rem',
        fontFamily: 'inherit'
    },
    tablaContenedor: {
        overflowX: 'auto'
    },
    tabla: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    filaEncabezado: {
        backgroundColor: '#F1F5F9'
    },
    celdaEncabezado: {
        padding: '1rem',
        textAlign: 'left',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#1E293B',
        borderBottom: '1px solid #E2E8F0'
    },
    fila: {
        borderBottom: '1px solid #E2E8F0'
    },
    celda: {
        padding: '1rem',
        fontSize: '0.875rem',
        color: '#1E293B'
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '0.5rem',
        backgroundColor: '#EFF6FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        color: '#2563EB',
        fontSize: '0.875rem'
    },
    nombreResidente: {
        fontWeight: '600',
        margin: 0
    },
    apto: {
        fontSize: '0.75rem',
        color: '#64748B',
        margin: '0.25rem 0 0 0'
    },
    motivoRechazo: {
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem'
    },
    acciones: {
        display: 'flex',
        gap: '0.5rem'
    },
    botonAccion: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        transition: 'transform 0.2s'
    },
    modalContenido: {
        padding: '2rem'
    },
    modalTitulo: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1E293B',
        margin: '0 0 1.5rem 0'
    },
    modalDescripcion: {
        color: '#64748B',
        marginBottom: '1.5rem',
        fontSize: '0.875rem'
    },
    detalleGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem'
    },
    detalleItem: {
        padding: '0.75rem',
        borderBottom: '1px solid #E2E8F0'
    },
    detalleLabel: {
        fontWeight: '600',
        color: '#1E293B',
        display: 'block',
        marginBottom: '0.25rem'
    },
    detalleValor: {
        color: '#64748B'
    },
    grupoFormulario: {
        marginBottom: '1.5rem'
    },
    label: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#1E293B',
        display: 'block',
        marginBottom: '0.5rem'
    },
    textarea: {
        width: '100%',
        minHeight: '100px',
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid #E2E8F0',
        fontSize: '0.875rem',
        fontFamily: 'Inter, sans-serif',
        resize: 'vertical'
    },
    botonesModal: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginTop: '1.5rem'
    },
    botonModalSecundario: {
        backgroundColor: '#F1F5F9',
        color: '#1E293B',
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid #E2E8F0',
        cursor: 'pointer',
        fontWeight: '600'
    },
    botonModalPrimario: {
        backgroundColor: '#EF4444',
        color: '#FFFFFF',
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600'
    },
    botonCerrarModal: {
        width: '100%',
        backgroundColor: '#2563EB',
        color: '#FFFFFF',
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        marginTop: '1.5rem'
    }
};

export default AprobacionReservas;
