/**
 * Reservas.jsx
 * ─────────────────────────────────────────────────────────
 * Listado de reservas con filtros, búsqueda y gestión administrativa.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservas } from '../hooks/useReservas';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { usePrestamos } from '../hooks/usePrestamos';
import { useInventario } from '../hooks/useInventario';
import EstadoBadge from '../components/ui/EstadoBadge';
import Modal from '../components/ui/Modal';
import { Plus, Eye, X, AlertTriangle, Calendar, Trash2, Search, Package, Check, AlertCircle } from 'lucide-react';
import { useUIFeedback } from '../context/UIFeedbackContext';

const Reservas = () => {
    const navigate = useNavigate();
    const { showToast } = useUIFeedback();
    const { user, profile } = useAuth();
    const { globalQuery } = useSearch();
    const isAdmin = profile?.rol === 'administrador';
    const isSupervisor = profile?.rol === 'supervisor';
    const { reservas, loading, fetchReservas, cancelarReserva, deleteReserva } = useReservas();
    const { solicitarPrestamo, fetchPrestamos, prestamos, reportarDanio } = usePrestamos();
    const { insumos, fetchInsumos } = useInventario();

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const ITEMS_POR_PAGINA = 8;

    // Modales
    const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
    const [isModalAbierto, setIsModalAbierto] = useState(false);
    
    const [isPrestamoModalAbierto, setIsPrestamoModalAbierto] = useState(false);
    const [reservaParaPrestamo, setReservaParaPrestamo] = useState(null);
    
    const [reservaCancelar, setReservaCancelar] = useState(null);
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [isCancelacionAbierto, setIsCancelacionAbierto] = useState(false);
    const [reservaEliminar, setReservaEliminar] = useState(null);
    const [isEliminacionAbierto, setIsEliminacionAbierto] = useState(false);
    
    const [procesando, setProcesando] = useState(false);

    // Estado para nueva solicitud de prestamo
    const [nuevoPrestamo, setNuevoPrestamo] = useState({ insumo_id: '', cantidad: 1 });
    const [reporteDanioData, setReporteDanioData] = useState({ id: '', obs: '' });

    useEffect(() => {
        cargarReservas();
        fetchInsumos();
    }, []);

    const cargarReservas = async () => {
        const residenteId = isAdmin || isSupervisor ? null : user?.id;
        await fetchReservas(residenteId, filtroEstado, fechaDesde, fechaHasta);
        setPaginaActual(1);
    };

    useEffect(() => {
        cargarReservas();
    }, [filtroEstado, fechaDesde, fechaHasta]);

    const reservasFiltradas = reservas.filter(r => {
        const queryLocal = searchQuery.toLowerCase();
        const queryGlobal = globalQuery.toLowerCase();
        
        const matches = (q) => {
            if (!q) return true;
            const nombreMatch = `${r.usuarios?.nombres} ${r.usuarios?.apellidos}`.toLowerCase().includes(q);
            const aptoMatch = r.usuarios?.numero_apto?.toLowerCase().includes(q);
            const tipoMatch = r.tipo_evento?.toLowerCase().includes(q);
            return nombreMatch || aptoMatch || tipoMatch;
        };
        
        return matches(queryLocal) && matches(queryGlobal);
    });

    const totalPaginas = Math.ceil(reservasFiltradas.length / ITEMS_POR_PAGINA);
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const reservasEnPagina = reservasFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);

    const handleVerDetalle = (reserva) => {
        setReservaSeleccionada(reserva);
        fetchPrestamos(reserva.id); // Cargar préstamos para el detalle
        setIsModalAbierto(true);
    };

    const handleAbrirPrestamos = (reserva) => {
        setReservaParaPrestamo(reserva);
        fetchPrestamos(reserva.id);
        setIsPrestamoModalAbierto(true);
    };

    const [errorPrestamo, setErrorPrestamo] = useState('');

    const handleSolicitarPrestamo = async () => {
        setErrorPrestamo('');
        if (!nuevoPrestamo.insumo_id || nuevoPrestamo.cantidad <= 0) return;

        // Verificar si ya existe una solicitud activa para este insumo
        const yaSolicitado = prestamos.find(p => 
            p.insumo_id === nuevoPrestamo.insumo_id && 
            ['solicitado', 'entregado'].includes(p.estado)
        );

        if (yaSolicitado) {
            setErrorPrestamo('Ya hiciste esta solicitud, espera que el supervisor o administrador confirme tu solicitud.');
            return;
        }
        
        const insumoSeleccionado = insumos.find(i => i.id === nuevoPrestamo.insumo_id);
        if (nuevoPrestamo.cantidad > insumoSeleccionado.cantidad_disponible) {
            setErrorPrestamo(`No puedes solicitar más de lo disponible (${insumoSeleccionado.cantidad_disponible} unidades)`);
            return;
        }

        setProcesando(true);
        const res = await solicitarPrestamo({
            reserva_id: reservaParaPrestamo.id,
            insumo_id: nuevoPrestamo.insumo_id,
            cantidad: nuevoPrestamo.cantidad
        });

        if (res.success) {
            fetchPrestamos(reservaParaPrestamo.id);
            fetchInsumos();
            setNuevoPrestamo({ insumo_id: '', cantidad: 1 });
        } else {
            setErrorPrestamo(res.error);
        }
        setProcesando(false);
    };

    const [isModalDanioAbierto, setIsModalDanioAbierto] = useState(false);
    const [prestamoADaniar, setPrestamoADaniar] = useState(null);
    const [obsDanio, setObsDanio] = useState('');

    const handleAbrirModalDanio = (prestamo) => {
        setPrestamoADaniar(prestamo);
        setObsDanio('');
        setIsModalDanioAbierto(true);
    };

    const handleConfirmarDanio = async () => {
        if (!obsDanio.trim()) return;
        setProcesando(true);
        const res = await reportarDanio(prestamoADaniar.id, obsDanio);
        if (res.success) {
            fetchPrestamos(reservaParaPrestamo.id);
            setIsModalDanioAbierto(false);
        }
        setProcesando(false);
    };

    const handleCancelarReserva = (reserva) => {
        setReservaCancelar(reserva);
        setMotivoCancelacion(''); // Reset motivo
        setIsCancelacionAbierto(true);
    };

    const handleEliminarReserva = (reserva) => {
        if (!isAdmin) {
            showToast('Solo el administrador puede eliminar registros permanentemente.', 'warning');
            return;
        }
        setReservaEliminar(reserva);
        setIsEliminacionAbierto(true);
    };

    const confirmarCancelacion = async () => {
        if (!reservaCancelar) return;
        
        // Si la reserva estaba aprobada, el motivo es obligatorio
        if (reservaCancelar.estado === 'aprobada' && !motivoCancelacion.trim()) {
            showToast('Debes proporcionar un motivo para cancelar una reserva aprobada.', 'warning');
            return;
        }

        setProcesando(true);
        const res = await cancelarReserva(reservaCancelar.id, motivoCancelacion);
        if (res.success) {
            setIsCancelacionAbierto(false);
            setReservaCancelar(null);
            setMotivoCancelacion('');
            fetchReservas();
        }
        setProcesando(false);
    };

    const confirmarEliminacion = async () => {
        setProcesando(true);
        try {
            const resultado = await deleteReserva(reservaEliminar.id);
            if (resultado.success) {
                await cargarReservas();
                setIsEliminacionAbierto(false);
            }
        } finally {
            setProcesando(false);
        }
    };

    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.titulo}>Mis Reservas</h1>
                    <p style={styles.subtitulo}>
                        {isAdmin || isSupervisor ? 'Todas las reservas del salón' : 'Gestiona tus reservas de eventos'}
                    </p>
                </div>
                <button onClick={() => navigate('/reservas/nueva')} style={styles.botonNuevo}>
                    <Plus size={20} /> Nueva Reserva
                </button>
            </div>

            {/* Búsqueda y Filtros */}
            <div style={styles.filtros}>
                <div style={{ ...styles.grupoFiltro, gridColumn: 'span 2' }}>
                    <label style={styles.labelFiltro}>Buscar localmente</label>
                    <div style={styles.searchWrapper}>
                        <Search size={18} color="#64748B" />
                        <input 
                            type="text" 
                            placeholder="Ej: Mathias, 707, Fiesta..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>
                </div>

                <div style={styles.grupoFiltro}>
                    <label style={styles.labelFiltro}>Estado</label>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        style={styles.selectFiltro}
                    >
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="aprobada">Aprobada</option>
                        <option value="rechazada">Rechazada</option>
                        <option value="cancelada">Cancelada</option>
                    </select>
                </div>

                <div style={styles.grupoFiltro}>
                    <label style={styles.labelFiltro}>Desde</label>
                    <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={styles.selectFiltro} />
                </div>

                <div style={styles.grupoFiltro}>
                    <label style={styles.labelFiltro}>Hasta</label>
                    <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={styles.selectFiltro} />
                </div>
            </div>

            {/* Tabla */}
            {loading ? (
                <div style={styles.cargando}>Cargando reservas...</div>
            ) : reservasEnPagina.length === 0 ? (
                <div style={styles.sinResultados}>
                    <Calendar size={48} color="#CBD5E1" />
                    <p>No se encontraron reservas</p>
                </div>
            ) : (
                <>
                    <div style={styles.tablaContenedor}>
                        <table style={styles.tabla}>
                            <thead>
                                <tr style={styles.filaEncabezado}>
                                    <th style={styles.celdaEncabezado}>Residente / Apartamento</th>
                                    <th style={styles.celdaEncabezado}>Fecha</th>
                                    <th style={styles.celdaEncabezado}>Horario</th>
                                    <th style={styles.celdaEncabezado}>Tipo de Evento</th>
                                    <th style={styles.celdaEncabezado}>Invitados</th>
                                    <th style={styles.celdaEncabezado}>Estado</th>
                                    <th style={styles.celdaEncabezado}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservasEnPagina.map(reserva => (
                                    <tr key={reserva.id} style={styles.fila}>
                                        <td style={styles.celda}>
                                            <div>
                                                <p style={styles.nombreResidente}>{reserva.usuarios?.nombres} {reserva.usuarios?.apellidos}</p>
                                                <p style={styles.apto}>Apto: {reserva.usuarios?.numero_apto}</p>
                                            </div>
                                        </td>
                                        <td style={styles.celda}>{formatearFecha(reserva.fecha_evento)}</td>
                                        <td style={styles.celda}>{reserva.hora_inicio} - {reserva.hora_fin}</td>
                                        <td style={styles.celda}>{reserva.tipo_evento}</td>
                                        <td style={styles.celda}>{reserva.numero_invitados}</td>
                                        <td style={styles.celda}><EstadoBadge estado={reserva.estado} /></td>
                                        <td style={styles.celda}>
                                            <div style={styles.acciones}>
                                                <button onClick={() => handleVerDetalle(reserva)} style={styles.botonIcono} title="Ver detalle"><Eye size={18} /></button>
                                                
                                                {/* Botón Préstamo (Paquete) - Solo si está aprobada */}
                                                {reserva.estado === 'aprobada' && (
                                                    <button onClick={() => handleAbrirPrestamos(reserva)} style={{ ...styles.botonIcono, color: '#6366F1' }} title="Préstamo de insumos"><Package size={18} /></button>
                                                )}

                                                {((reserva.estado === 'pendiente' && (reserva.residente_id === user?.id || isAdmin || isSupervisor)) || (reserva.estado === 'aprobada' && (isAdmin || isSupervisor))) && (
                                                    <button onClick={() => handleCancelarReserva(reserva)} style={{ ...styles.botonIcono, color: '#F59E0B' }} title="Cancelar"><X size={18} /></button>
                                                )}

                                                {isAdmin && (reserva.estado === 'cancelada' || reserva.estado === 'rechazada') && (
                                                    <button onClick={() => handleEliminarReserva(reserva)} style={{ ...styles.botonIcono, color: '#EF4444' }} title="Eliminar registro"><Trash2 size={18} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPaginas > 1 && (
                        <div style={styles.paginacion}>
                            <button onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} style={styles.botonPaginacion}>Anterior</button>
                            <span style={styles.numeroPaginacion}>Página {paginaActual} de {totalPaginas}</span>
                            <button onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas} style={styles.botonPaginacion}>Siguiente</button>
                        </div>
                    )}
                </>
            )}

            {/* Modal Préstamos */}
            {isPrestamoModalAbierto && reservaParaPrestamo && (
                <Modal isOpen={isPrestamoModalAbierto} onClose={() => setIsPrestamoModalAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <h2 style={styles.modalTitulo}>Insumos para el Evento</h2>
                        <p style={styles.modalSub}>Reserva: {reservaParaPrestamo.tipo_evento} - {formatearFecha(reservaParaPrestamo.fecha_evento)}</p>
                        
                        {/* Mensaje de Error "Bonito" */}
                        {errorPrestamo && (
                            <div style={styles.errorBanner}>
                                <AlertCircle size={18} />
                                <span>{errorPrestamo}</span>
                            </div>
                        )}

                        {/* Solicitar Nuevo */}
                        <div style={styles.nuevoPrestamoBox}>
                            <select 
                                style={styles.selectFiltro}
                                value={nuevoPrestamo.insumo_id}
                                onChange={(e) => setNuevoPrestamo({...nuevoPrestamo, insumo_id: e.target.value})}
                            >
                                <option value="">Selecciona un insumo...</option>
                                {insumos.filter(i => i.cantidad_disponible > 0).map(i => (
                                    <option key={i.id} value={i.id}>{i.nombre} (Disp: {i.cantidad_disponible})</option>
                                ))}
                            </select>
                            <input 
                                type="number" 
                                min="1"
                                style={{...styles.selectFiltro, width: '80px'}}
                                value={nuevoPrestamo.cantidad || ''}
                                onChange={(e) => setNuevoPrestamo({...nuevoPrestamo, cantidad: parseInt(e.target.value) || 0})}
                            />
                            <button onClick={handleSolicitarPrestamo} disabled={procesando} style={styles.botonAdd}>Solicitar</button>
                        </div>

                        {/* Lista de Préstamos Actuales */}
                        <div style={styles.listaPrestamos}>
                            {prestamos.length === 0 ? (
                                <p style={styles.empty}>No hay insumos solicitados.</p>
                            ) : (
                                prestamos.map(p => (
                                    <div key={p.id} style={styles.prestamoItem}>
                                        <div>
                                            <p style={{fontWeight: 600, margin: 0}}>{p.insumos?.nombre} x {p.cantidad}</p>
                                            <EstadoBadge estado={p.estado} />
                                        </div>
                                        <div style={{display: 'flex', gap: '0.5rem'}}>
                                            {p.estado === 'entregado' && (
                                                <button onClick={() => handleAbrirModalDanio(p)} style={{...styles.botonIcono, color: '#EF4444'}} title="Reportar Daño"><AlertCircle size={18} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button onClick={() => setIsPrestamoModalAbierto(false)} style={styles.botonCerrarModal}>Cerrar</button>
                    </div>
                </Modal>
            )}

            {/* Modal Reportar Daño Insumo */}
            {isModalDanioAbierto && prestamoADaniar && (
                <Modal isOpen={isModalDanioAbierto} onClose={() => setIsModalDanioAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <h2 style={styles.modalTitulo}>Reportar Daño</h2>
                        <p style={styles.modalSub}>Insumo: {prestamoADaniar.insumos?.nombre} x {prestamoADaniar.cantidad}</p>
                        
                        <textarea 
                            style={styles.textarea}
                            placeholder="Describe detalladamente el daño ocurrido..."
                            value={obsDanio}
                            onChange={(e) => setObsDanio(e.target.value)}
                        />

                        <div style={styles.botonesModal}>
                            <button onClick={() => setIsModalDanioAbierto(false)} style={styles.btnSecundario}>Cancelar</button>
                            <button 
                                onClick={handleConfirmarDanio} 
                                disabled={procesando || !obsDanio.trim()} 
                                style={{...styles.btnPrimario, backgroundColor: '#EF4444'}}
                            >
                                {procesando ? 'Procesando...' : 'Confirmar Daño'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Resto de modales (Ver Detalle, Cancelar, Eliminar) ... */}
            {isModalAbierto && reservaSeleccionada && (
                <Modal isOpen={isModalAbierto} onClose={() => setIsModalAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <h2 style={styles.modalTitulo}>Detalle de Reserva</h2>
                        <div style={styles.detalleItem}><span style={styles.detalleLabel}>Residente:</span><span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.nombres} {reservaSeleccionada.usuarios?.apellidos}</span></div>
                        <div style={styles.detalleItem}><span style={styles.detalleLabel}>Apartamento:</span><span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.numero_apto}</span></div>
                        <div style={styles.detalleItem}><span style={styles.detalleLabel}>Fecha:</span><span style={styles.detalleValor}>{formatearFecha(reservaSeleccionada.fecha_evento)}</span></div>
                        <div style={styles.detalleItem}><span style={styles.detalleLabel}>Horario:</span><span style={styles.detalleValor}>{reservaSeleccionada.hora_inicio} - {reservaSeleccionada.hora_fin}</span></div>
                        <div style={styles.detalleItem}><span style={styles.detalleLabel}>Invitados:</span><span style={styles.detalleValor}>{reservaSeleccionada.numero_invitados}</span></div>
                        <div style={styles.detalleItem}><span style={styles.detalleLabel}>Estado:</span><EstadoBadge estado={reservaSeleccionada.estado} /></div>
                        
                        {/* Nueva sección de Insumos Prestados en el Detalle */}
                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>Insumos Confirmados</h3>
                            {prestamos.filter(p => ['entregado', 'devuelto', 'danado'].includes(p.estado)).length === 0 ? (
                                <p style={{ fontSize: '0.875rem', color: '#64748B', textAlign: 'center' }}>No hay insumos confirmados para esta reserva aún.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {prestamos.filter(p => ['entregado', 'devuelto', 'danado'].includes(p.estado)).map(p => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: '#F0FDF4', borderRadius: '0.375rem', border: '1px solid #DCFCE7' }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#166534' }}>{p.insumos?.nombre} x {p.cantidad}</span>
                                            <EstadoBadge estado={p.estado} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={() => setIsModalAbierto(false)} style={styles.botonCerrarModal}>Cerrar</button>
                    </div>
                </Modal>
            )}

            {isCancelacionAbierto && reservaCancelar && (
                <Modal isOpen={isCancelacionAbierto} onClose={() => setIsCancelacionAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <div style={styles.modalAlerta}>
                            <AlertTriangle size={48} color="#F59E0B" />
                            <h2 style={styles.modalTitulo}>¿Cancelar esta reserva?</h2>
                            <p style={styles.modalDescripcion}>
                                {reservaCancelar.estado === 'aprobada' 
                                    ? 'Esta reserva ya estaba aprobada. Por favor, indica el motivo de la cancelación:' 
                                    : 'Esta acción cambiará el estado a \'Cancelada\'.'}
                            </p>
                        </div>

                        {reservaCancelar.estado === 'aprobada' && (
                            <textarea
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    marginBottom: '1rem',
                                    fontFamily: 'inherit',
                                    fontSize: '0.875rem'
                                }}
                                placeholder="Escribe el motivo aquí..."
                                value={motivoCancelacion}
                                onChange={(e) => setMotivoCancelacion(e.target.value)}
                            />
                        )}

                        <div style={styles.botonesModalConfirm}>
                            <button onClick={() => setIsCancelacionAbierto(false)} style={styles.botonModalSecundario}>Volver</button>
                            <button 
                                onClick={confirmarCancelacion} 
                                disabled={procesando || (reservaCancelar.estado === 'aprobada' && !motivoCancelacion.trim())} 
                                style={styles.botonModalPrimario}
                            >
                                {procesando ? 'Procesando...' : 'Sí, cancelar'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {isEliminacionAbierto && reservaEliminar && (
                <Modal isOpen={isEliminacionAbierto} onClose={() => setIsEliminacionAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <div style={styles.modalAlerta}>
                            <AlertTriangle size={48} color="#EF4444" />
                            <h2 style={styles.modalTitulo}>¿Eliminar permanentemente?</h2>
                            <p style={styles.modalDescripcion}>Este registro desaparecerá de la base de datos y no se podrá recuperar.</p>
                        </div>
                        <div style={styles.botonesModalConfirm}>
                            <button onClick={() => setIsEliminacionAbierto(false)} style={styles.botonModalSecundario}>Cancelar</button>
                            <button onClick={confirmarEliminacion} disabled={procesando} style={{...styles.botonModalPrimario, backgroundColor: '#EF4444'}}>{procesando ? 'Eliminando...' : 'Sí, eliminar'}</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '2rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    titulo: { fontSize: '1.875rem', fontWeight: '700', color: '#1E293B', margin: 0 },
    subtitulo: { fontSize: '0.875rem', color: '#64748B', margin: '0.5rem 0 0 0' },
    botonNuevo: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#2563EB', color: '#FFFFFF', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' },
    filtros: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem', backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' },
    grupoFiltro: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    labelFiltro: { fontSize: '0.875rem', fontWeight: '600', color: '#1E293B' },
    selectFiltro: { padding: '0.625rem', borderRadius: '0.375rem', border: '1px solid #E2E8F0', fontSize: '0.875rem' },
    searchWrapper: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.75rem', border: '1px solid #E2E8F0', borderRadius: '0.375rem' },
    searchInput: { border: 'none', padding: '0.625rem 0', width: '100%', outline: 'none', fontSize: '0.875rem' },
    cargando: { textAlign: 'center', padding: '2rem', color: '#64748B' },
    sinResultados: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', backgroundColor: '#FFFFFF', borderRadius: '0.5rem', color: '#64748B' },
    tablaContenedor: { backgroundColor: '#FFFFFF', borderRadius: '0.5rem', border: '1px solid #E2E8F0', overflow: 'auto' },
    tabla: { width: '100%', borderCollapse: 'collapse' },
    filaEncabezado: { backgroundColor: '#F1F5F9' },
    celdaEncabezado: { padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#1E293B', borderBottom: '1px solid #E2E8F0' },
    fila: { borderBottom: '1px solid #E2E8F0' },
    celda: { padding: '1rem', fontSize: '0.875rem', color: '#1E293B' },
    nombreResidente: { fontWeight: '600', margin: 0 },
    apto: { fontSize: '0.75rem', color: '#64748B', margin: '0.25rem 0 0 0' },
    acciones: { display: 'flex', gap: '0.5rem' },
    botonIcono: { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: '0.5rem' },
    paginacion: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' },
    botonPaginacion: { backgroundColor: '#2563EB', color: '#FFFFFF', padding: '0.625rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' },
    numeroPaginacion: { fontSize: '0.875rem', color: '#64748B' },
    modalContenido: { padding: '2rem' },
    modalTitulo: { fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', margin: '0 0 0.5rem 0' },
    modalSub: { fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem' },
    errorBanner: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#FEF2F2', color: '#B91C1C', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #FEE2E2', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '500' },
    nuevoPrestamoBox: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '0.5rem' },
    botonAdd: { backgroundColor: '#6366F1', color: '#FFFFFF', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' },
    textarea: { width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: '1rem' },
    botonesModal: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' },
    btnSecundario: { backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    btnPrimario: { backgroundColor: '#6366F1', color: '#FFFFFF', border: 'none', padding: '0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    listaPrestamos: { display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' },
    prestamoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem' },
    empty: { textAlign: 'center', color: '#64748B', padding: '2rem' },
    detalleItem: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid #E2E8F0' },
    detalleLabel: { fontWeight: '600', color: '#1E293B' },
    detalleValor: { color: '#64748B' },
    botonCerrarModal: { width: '100%', backgroundColor: '#2563EB', color: '#FFFFFF', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', marginTop: '1.5rem' },
    modalAlerta: { textAlign: 'center', paddingBottom: '1.5rem' },
    modalDescripcion: { color: '#64748B', fontSize: '0.875rem', marginTop: '1rem' },
    botonesModalConfirm: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' },
    botonModalSecundario: { backgroundColor: '#F1F5F9', color: '#1E293B', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #E2E8F0' },
    botonModalPrimario: { backgroundColor: '#F59E0B', color: '#FFFFFF', padding: '0.75rem', borderRadius: '0.375rem', border: 'none' }
};

export default Reservas;
