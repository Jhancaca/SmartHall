/**
 * GestionPrestamos.jsx
 * ─────────────────────────────────────────────────────────
 * Página administrativa para la gestión completa del ciclo de vida de los
 * préstamos de insumos del SmartHall.
 *
 * Flujo de estados del préstamo:
 *   solicitado → entregado → devuelto
 *   solicitado → rechazado
 *   entregado → dañado
 *
 * Hooks utilizados:
 *   - usePrestamos: provee la lista de préstamos, estado de carga,
 *                   fetchPrestamos y actualizarEstadoPrestamo.
 *   - useAuth:      provee el perfil del usuario autenticado (profile).
 *   - useUIFeedback:provee showToast para notificaciones al usuario.
 *
 * Componentes UI importados:
 *   - EstadoBadge: muestra una insignia visual con el estado del préstamo.
 *   - Modal:       diálogo modal reutilizable.
 *
 * Renderiza:
 *   - Un encabezado con título y subtítulo descriptivo.
 *   - Una barra de pestañas para filtrar préstamos por estado.
 *   - Una cuadrícula de tarjetas con la información de cada préstamo.
 *   - Dos modales: uno de confirmación de entrega y otro de justificación
 *     (para rechazos y reportes de daño).
 */

import { useState, useEffect } from 'react';
import { usePrestamos } from '../hooks/usePrestamos';
import { useAuth } from '../context/AuthContext';
import { useUIFeedback } from '../context/UIFeedbackContext';
import EstadoBadge from '../components/ui/EstadoBadge';
import Modal from '../components/ui/Modal';
import { Check, X, Package, RotateCcw, AlertTriangle, MessageSquare, Info } from 'lucide-react';

const GestionPrestamos = () => {
    /** Hook de préstamos: lista completa, estado de carga y funciones de acción */
    const { prestamos, loading, fetchPrestamos, actualizarEstadoPrestamo } = usePrestamos();
    /** Perfil del usuario autenticado (aunque no se usa directamente aquí, se mantiene por consistencia) */
    const { profile } = useAuth();
    /** Función para mostrar notificaciones toast al usuario */
    const { showToast } = useUIFeedback();

    /** Estado del filtro activo en la barra de pestañas; valores posibles: 'solicitado', 'entregado', 'devuelto', 'danado', '' */
    const [filtroEstado, setFiltroEstado] = useState('solicitado');

    /** Indica si el modal de justificación (rechazo / daño) está abierto */
    const [isModalJustificacionAbierto, setIsModalJustificacionAbierto] = useState(false);
    /** Indica si el modal de confirmación de entrega está abierto */
    const [isModalConfirmacionAbierto, setIsModalConfirmacionAbierto] = useState(false);
    
    /**
     * Datos de la acción en curso: id del préstamo, estado destino,
     * título del modal y el objeto completo del préstamo (p).
     */
    const [datosAccion, setDatosAccion] = useState({ id: '', estado: '', titulo: '', p: null });
    /** Texto de justificación ingresado por el admin (rechazo o reporte de daño) */
    const [justificacion, setJustificacion] = useState('');
    /** Flag que indica si se está procesando una acción, para deshabilitar botones */
    const [procesando, setProcesando] = useState(false);

    /**
     * Efecto inicial: carga la lista de préstamos al montar el componente.
     * Se ejecuta una sola vez ([] de dependencias vacío).
     */
    useEffect(() => {
        fetchPrestamos();
    }, []);

    /**
     * Abre el modal de justificación con los datos del préstamo a procesar.
     * Se utiliza para rechazar una solicitud o reportar un daño.
     * @param {Object} p         - Objeto del préstamo completo.
     * @param {string} nuevoEstado - Estado destino ('rechazado' o 'danado').
     * @param {string} titulo     - Título a mostrar en el modal.
     */
    const handleAbrirJustificacion = (p, nuevoEstado, titulo) => {
        setDatosAccion({ id: p.id, estado: nuevoEstado, titulo, p });
        setJustificacion('');
        setIsModalJustificacionAbierto(true);
    };

    /**
     * Abre el modal de confirmación de entrega para un préstamo en estado 'solicitado'.
     * @param {Object} p - Objeto del préstamo a entregar.
     */
    const handleAbrirConfirmacion = (p) => {
        setDatosAccion({ id: p.id, estado: 'entregado', titulo: 'Confirmar Entrega', p });
        setIsModalConfirmacionAbierto(true);
    };

    /**
     * Confirma la entrega del préstamo al residente.
     * Llama a actualizarEstadoPrestamo con el id y el nuevo estado 'entregado'.
     * En éxito, recarga la lista, cierra el modal y muestra toast de éxito.
     * En error, muestra toast con el mensaje de error del servidor.
     */
    const confirmarEntrega = async () => {
        setProcesando(true);
        const res = await actualizarEstadoPrestamo(datosAccion.id, 'entregado');
        if (res.success) {
            fetchPrestamos();
            setIsModalConfirmacionAbierto(false);
            showToast('Entrega confirmada exitosamente.', 'success');
        } else {
            showToast(res.error, 'error');
        }
        setProcesando(false);
    };

    /**
     * Ejecuta una acción directa de cambio de estado sin justificación.
     * Se usa para confirmar devolución de un préstamo 'entregado'.
     * @param {string} id          - ID del préstamo.
     * @param {string} nuevoEstado - Nuevo estado a aplicar ('devuelto').
     */
    const handleAccionDirecta = async (id, nuevoEstado) => {
        setProcesando(true);
        const res = await actualizarEstadoPrestamo(id, nuevoEstado);
        if (res.success) fetchPrestamos();
        setProcesando(false);
    };

    /**
     * Confirma una acción que requiere justificación textual.
     * Se usa para rechazar solicitudes o reportar daños.
     * Valida que el campo justificación no esté vacío antes de proceder.
     * Llama a actualizarEstadoPrestamo con el id, el estado y la justificación.
     * En éxito, recarga la lista, cierra el modal y muestra toast de éxito.
     * En error, muestra toast con el mensaje de error del servidor.
     */
    const confirmarAccionConJustificacion = async () => {
        if (!justificacion.trim()) return;
        setProcesando(true);
        const res = await actualizarEstadoPrestamo(datosAccion.id, datosAccion.estado, justificacion);
        if (res.success) {
            fetchPrestamos();
            setIsModalJustificacionAbierto(false);
            showToast('Acción registrada correctamente.', 'success');
        } else {
            showToast(res.error, 'error');
        }
        setProcesando(false);
    };

    /**
     * Lista filtrada de préstamos según el estado seleccionado en la pestaña.
     * Si filtroEstado está vacío, muestra todos los préstamos.
     */
    const prestamosFiltrados = prestamos.filter(p => 
        filtroEstado ? p.estado === filtroEstado : true
    );

    /**
     * Formatea una fecha ISO a formato legible en español (largo).
     * @param {string} fecha - Fecha en formato ISO o Date.
     * @returns {string} Fecha formateada (ej: "lunes, 10 de junio de 2026").
     */
    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    return (
        <div style={styles.container}>
            {/* Encabezado de la página */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.titulo}>Gestión de Préstamos</h1>
                    <p style={styles.subtitulo}>Aprobación de insumos y control de devoluciones.</p>
                </div>
            </div>

            {/* Pestañas de filtro por estado del préstamo */}
            <div style={styles.tabs}>
                <button onClick={() => setFiltroEstado('solicitado')} style={filtroEstado === 'solicitado' ? styles.tabActive : styles.tab}>Solicitudes</button>
                <button onClick={() => setFiltroEstado('entregado')} style={filtroEstado === 'entregado' ? styles.tabActive : styles.tab}>En Uso</button>
                <button onClick={() => setFiltroEstado('devuelto')} style={filtroEstado === 'devuelto' ? styles.tabActive : styles.tab}>Devueltos</button>
                <button onClick={() => setFiltroEstado('danado')} style={filtroEstado === 'danado' ? styles.tabActive : styles.tab}>Dañados</button>
                <button onClick={() => setFiltroEstado('')} style={!filtroEstado ? styles.tabActive : styles.tab}>Todos</button>
            </div>

            {/* Contenido principal: carga, vacío o cuadrícula de tarjetas */}
            {loading ? (
                <div style={styles.loading}>Cargando préstamos...</div>
            ) : prestamosFiltrados.length === 0 ? (
                <div style={styles.empty}>No hay préstamos en este estado.</div>
            ) : (
                <div style={styles.grid}>
                    {prestamosFiltrados.map(p => (
                        <div key={p.id} style={styles.card}>
                            {/* Encabezado de la tarjeta: ícono, nombre del insumo, nombre del residente y badge de estado */}
                            <div style={styles.cardHeader}>
                                <div style={styles.iconBox}><Package size={20} color="#6366F1" /></div>
                                <div>
                                    <h3 style={styles.insumoNombre}>{p.insumos?.nombre} x {p.cantidad}</h3>
                                    <p style={styles.reservaInfo}>
                                        {p.reservas?.usuarios?.nombres} - Apto {p.reservas?.usuarios?.numero_apto}
                                    </p>
                                </div>
                                <EstadoBadge estado={p.estado} />
                            </div>

                            {/* Cuerpo de la tarjeta: fecha del evento y observaciones */}
                            <div style={styles.cardBody}>
                                <p style={styles.fecha}>Evento: {new Date(p.reservas?.fecha_evento).toLocaleDateString()}</p>
                                {/* Observaciones del residente (si existen) */}
                                {p.observaciones_residente && (
                                    <div style={styles.obsBox}>
                                        <MessageSquare size={14} />
                                        <span>{p.observaciones_residente}</span>
                                    </div>
                                )}
                                {/* Observaciones del administrador (si existen) — muestra alerta en rojo */}
                                {p.observaciones_admin && (
                                    <div style={{...styles.obsBox, backgroundColor: '#FEF2F2', borderColor: '#FEE2E2'}}>
                                        <AlertTriangle size={14} color="#B91C1C" />
                                        <span style={{color: '#B91C1C'}}>Admin: {p.observaciones_admin}</span>
                                    </div>
                                )}
                            </div>

                            {/* Acciones disponibles según el estado del préstamo */}
                            <div style={styles.cardActions}>
                                {/* Estado 'solicitado': opciones de entregar o rechazar */}
                                {p.estado === 'solicitado' && (
                                    <>
                                        <button onClick={() => handleAbrirConfirmacion(p)} disabled={procesando} style={styles.btnApprove}><Check size={18} /> Entregar</button>
                                        <button onClick={() => handleAbrirJustificacion(p, 'rechazado', 'Rechazar Solicitud')} disabled={procesando} style={styles.btnReject}><X size={18} /> Rechazar</button>
                                    </>
                                )}
                                {/* Estado 'entregado': opciones de recibir devolución o reportar daño */}
                                {p.estado === 'entregado' && (
                                    <>
                                        <button onClick={() => handleAccionDirecta(p.id, 'devuelto')} disabled={procesando} style={styles.btnReturn}><RotateCcw size={18} /> Recibir</button>
                                        <button onClick={() => handleAbrirJustificacion(p, 'danado', 'Reportar Daño')} disabled={procesando} style={styles.btnDamage}><AlertTriangle size={18} /> Daño</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Confirmación de Entrega — se muestra cuando se aprueba un préstamo solicitado */}
            {isModalConfirmacionAbierto && datosAccion.p && (
                <Modal isOpen={isModalConfirmacionAbierto} onClose={() => setIsModalConfirmacionAbierto(false)}>
                    <div style={styles.modalContenido}>
                        {/* Ícono informativo centrado */}
                        <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                            <div style={{backgroundColor: '#EEF2FF', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'}}>
                                <Info size={30} color="#6366F1" />
                            </div>
                            <h2 style={styles.modalTitulo}>Confirmar Entrega</h2>
                        </div>
                        
                        {/* Mensaje de confirmación con datos del préstamo y del usuario */}
                        <p style={{textAlign: 'center', color: '#475569', lineHeight: '1.6', fontSize: '1.1rem'}}>
                            ¿Quieres confirmar el préstamo de <strong>{datosAccion.p.insumos?.nombre} (x{datosAccion.p.cantidad})</strong> al usuario <strong>{datosAccion.p.reservas?.usuarios?.nombres}</strong> para el día <strong>{formatearFecha(datosAccion.p.reservas?.fecha_evento)}</strong>?
                        </p>

                        {/* Botones de acción: cancelar o confirmar */}
                        <div style={styles.botonesModal}>
                            <button onClick={() => setIsModalConfirmacionAbierto(false)} style={styles.btnSecundario}>Cancelar</button>
                            <button onClick={confirmarEntrega} disabled={procesando} style={styles.btnPrimario}>
                                {procesando ? 'Procesando...' : 'Sí, Confirmar'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal de Justificación — se usa para rechazar solicitudes o reportar daños */}
            {isModalJustificacionAbierto && (
                <Modal isOpen={isModalJustificacionAbierto} onClose={() => setIsModalJustificacionAbierto(false)}>
                    <div style={styles.modalContenido}>
                        {/* Título dinámico: "Rechazar Solicitud" o "Reportar Daño" */}
                        <h2 style={styles.modalTitulo}>{datosAccion.titulo}</h2>
                        <p style={styles.modalSub}>Por favor, ingresa el motivo o detalles de esta acción.</p>
                        
                        {/* Campo de texto para la justificación del admin */}
                        <textarea 
                            style={styles.textarea}
                            placeholder="Escribe aquí los detalles..."
                            value={justificacion}
                            onChange={(e) => setJustificacion(e.target.value)}
                        />

                        {/* Botones: cancelar o confirmar (deshabilitado si no hay texto o está procesando) */}
                        <div style={styles.botonesModal}>
                            <button onClick={() => setIsModalJustificacionAbierto(false)} style={styles.btnSecundario}>Cancelar</button>
                            <button 
                                onClick={confirmarAccionConJustificacion} 
                                disabled={procesando || !justificacion.trim()} 
                                style={{...styles.btnPrimario, backgroundColor: datosAccion.estado === 'rechazado' ? '#EF4444' : '#F59E0B'}}
                            >
                                {procesando ? 'Procesando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

/**
 * Estilos inline del componente GestionPrestamos.
 * Organizados por sección: contenedor, encabezado, pestañas, tarjetas,
 * acciones, estados de carga, modales y botones.
 */
const styles = {
    /** Contenedor principal de la página con padding uniforme */
    container: { padding: '2rem' },
    /** Sección del encabezado (título + subtítulo) */
    header: { marginBottom: '2rem' },
    /** Título principal de la página */
    titulo: { fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', margin: 0 },
    /** Subtítulo descriptivo debajo del título */
    subtitulo: { color: '#64748B', marginTop: '0.5rem' },
    /** Contenedor de las pestañas de filtro */
    tabs: { display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' },
    /** Estilo de pestaña inactiva */
    tab: { background: 'none', border: 'none', color: '#64748B', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' },
    /** Estilo de pestaña activa (con borde inferior indigo) */
    tabActive: { background: 'none', border: 'none', color: '#6366F1', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700', borderBottom: '2px solid #6366F1' },
    /** Cuadrícula responsiva de tarjetas de préstamo */
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
    /** Tarjeta individual de préstamo */
    card: { backgroundColor: '#FFFFFF', borderRadius: '0.75rem', border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    /** Encabezado de la tarjeta (ícono + info + badge) */
    cardHeader: { display: 'flex', gap: '1rem', alignItems: 'flex-start' },
    /** Caja del ícono del insumo */
    iconBox: { padding: '0.75rem', backgroundColor: '#EEF2FF', borderRadius: '0.5rem' },
    /** Nombre del insumo en la tarjeta */
    insumoNombre: { fontSize: '1.125rem', fontWeight: '700', color: '#1E293B', margin: 0 },
    /** Información del residente y apartamento */
    reservaInfo: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
    /** Cuerpo de la tarjeta (flex grow para ocupar espacio disponible) */
    cardBody: { flex: 1 },
    /** Fecha del evento */
    fecha: { fontSize: '0.875rem', color: '#1E293B', marginBottom: '0.5rem' },
    /** Caja de observaciones (residente o admin) */
    obsBox: { display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#475569', border: '1px solid #E2E8F0', marginBottom: '0.5rem' },
    /** Contenedor de botones de acción en la tarjeta */
    cardActions: { display: 'flex', gap: '0.75rem', marginTop: '0.5rem' },
    /** Botón de aprobar/entregar (verde) */
    btnApprove: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    /** Botón de rechazar (rojo) */
    btnReject: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    /** Botón de recibir devolución (azul) */
    btnReturn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#3B82F6', color: '#FFFFFF', border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    /** Botón de reportar daño (amarillo) */
    btnDamage: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#F59E0B', color: '#FFFFFF', border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    /** Estado de carga centrado */
    loading: { textAlign: 'center', padding: '4rem', color: '#64748B' },
    /** Estado vacío (sin resultados) centrado con fondo gris */
    empty: { textAlign: 'center', padding: '4rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '0.75rem' },
    /** Contenedor interno del contenido del modal */
    modalContenido: { padding: '2rem' },
    /** Título del modal */
    modalTitulo: { fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', margin: 0 },
    /** Subtítulo/descripción del modal */
    modalSub: { fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem', marginTop: '0.5rem' },
    /** Campo de textarea para justificación */
    textarea: { width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', resize: 'none' },
    /** Contenedor de botones del modal (dos columnas) */
    botonesModal: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' },
    /** Botón secundario del modal (cancelar) */
    btnSecundario: { backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    /** Botón primario del modal (confirmar acción) */
    btnPrimario: { backgroundColor: '#6366F1', color: '#FFFFFF', border: 'none', padding: '0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }
};

export default GestionPrestamos;
