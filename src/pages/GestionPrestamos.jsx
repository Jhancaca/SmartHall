/**
 * GestionPrestamos.jsx
 * ─────────────────────────────────────────────────────────
 * Módulo administrativo para aprobar/rechazar préstamos y gestionar devoluciones.
 */

import { useState, useEffect } from 'react';
import { usePrestamos } from '../hooks/usePrestamos';
import { useAuth } from '../context/AuthContext';
import EstadoBadge from '../components/ui/EstadoBadge';
import Modal from '../components/ui/Modal';
import { Check, X, Package, RotateCcw, AlertTriangle, MessageSquare, Info } from 'lucide-react';

const GestionPrestamos = () => {
    const { prestamos, loading, fetchPrestamos, actualizarEstadoPrestamo } = usePrestamos();
    const { profile } = useAuth();
    const [filtroEstado, setFiltroEstado] = useState('solicitado');

    // Modales
    const [isModalJustificacionAbierto, setIsModalJustificacionAbierto] = useState(false);
    const [isModalConfirmacionAbierto, setIsModalConfirmacionAbierto] = useState(false);
    
    const [datosAccion, setDatosAccion] = useState({ id: '', estado: '', titulo: '', p: null });
    const [justificacion, setJustificacion] = useState('');
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        fetchPrestamos();
    }, []);

    const handleAbrirJustificacion = (p, nuevoEstado, titulo) => {
        setDatosAccion({ id: p.id, estado: nuevoEstado, titulo, p });
        setJustificacion('');
        setIsModalJustificacionAbierto(true);
    };

    const handleAbrirConfirmacion = (p) => {
        setDatosAccion({ id: p.id, estado: 'entregado', titulo: 'Confirmar Entrega', p });
        setIsModalConfirmacionAbierto(true);
    };

    const confirmarEntrega = async () => {
        setProcesando(true);
        const res = await actualizarEstadoPrestamo(datosAccion.id, 'entregado');
        if (res.success) {
            fetchPrestamos();
            setIsModalConfirmacionAbierto(false);
        } else {
            alert(res.error);
        }
        setProcesando(false);
    };

    const handleAccionDirecta = async (id, nuevoEstado) => {
        setProcesando(true);
        const res = await actualizarEstadoPrestamo(id, nuevoEstado);
        if (res.success) fetchPrestamos();
        setProcesando(false);
    };

    const confirmarAccionConJustificacion = async () => {
        if (!justificacion.trim()) return;
        setProcesando(true);
        const res = await actualizarEstadoPrestamo(datosAccion.id, datosAccion.estado, justificacion);
        if (res.success) {
            fetchPrestamos();
            setIsModalJustificacionAbierto(false);
        } else {
            alert(res.error);
        }
        setProcesando(false);
    };

    const prestamosFiltrados = prestamos.filter(p => 
        filtroEstado ? p.estado === filtroEstado : true
    );

    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.titulo}>Gestión de Préstamos</h1>
                    <p style={styles.subtitulo}>Aprobación de insumos y control de devoluciones.</p>
                </div>
            </div>

            <div style={styles.tabs}>
                <button onClick={() => setFiltroEstado('solicitado')} style={filtroEstado === 'solicitado' ? styles.tabActive : styles.tab}>Solicitudes</button>
                <button onClick={() => setFiltroEstado('entregado')} style={filtroEstado === 'entregado' ? styles.tabActive : styles.tab}>En Uso</button>
                <button onClick={() => setFiltroEstado('devuelto')} style={filtroEstado === 'devuelto' ? styles.tabActive : styles.tab}>Devueltos</button>
                <button onClick={() => setFiltroEstado('danado')} style={filtroEstado === 'danado' ? styles.tabActive : styles.tab}>Dañados</button>
                <button onClick={() => setFiltroEstado('')} style={!filtroEstado ? styles.tabActive : styles.tab}>Todos</button>
            </div>

            {loading ? (
                <div style={styles.loading}>Cargando préstamos...</div>
            ) : prestamosFiltrados.length === 0 ? (
                <div style={styles.empty}>No hay préstamos en este estado.</div>
            ) : (
                <div style={styles.grid}>
                    {prestamosFiltrados.map(p => (
                        <div key={p.id} style={styles.card}>
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

                            <div style={styles.cardBody}>
                                <p style={styles.fecha}>Evento: {new Date(p.reservas?.fecha_evento).toLocaleDateString()}</p>
                                {p.observaciones_residente && (
                                    <div style={styles.obsBox}>
                                        <MessageSquare size={14} />
                                        <span>{p.observaciones_residente}</span>
                                    </div>
                                )}
                                {p.observaciones_admin && (
                                    <div style={{...styles.obsBox, backgroundColor: '#FEF2F2', borderColor: '#FEE2E2'}}>
                                        <AlertTriangle size={14} color="#B91C1C" />
                                        <span style={{color: '#B91C1C'}}>Admin: {p.observaciones_admin}</span>
                                    </div>
                                )}
                            </div>

                            <div style={styles.cardActions}>
                                {p.estado === 'solicitado' && (
                                    <>
                                        <button onClick={() => handleAbrirConfirmacion(p)} disabled={procesando} style={styles.btnApprove}><Check size={18} /> Entregar</button>
                                        <button onClick={() => handleAbrirJustificacion(p, 'rechazado', 'Rechazar Solicitud')} disabled={procesando} style={styles.btnReject}><X size={18} /> Rechazar</button>
                                    </>
                                )}
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

            {/* Modal de Confirmación Entrega */}
            {isModalConfirmacionAbierto && datosAccion.p && (
                <Modal isOpen={isModalConfirmacionAbierto} onClose={() => setIsModalConfirmacionAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                            <div style={{backgroundColor: '#EEF2FF', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'}}>
                                <Info size={30} color="#6366F1" />
                            </div>
                            <h2 style={styles.modalTitulo}>Confirmar Entrega</h2>
                        </div>
                        
                        <p style={{textAlign: 'center', color: '#475569', lineHeight: '1.6', fontSize: '1.1rem'}}>
                            ¿Quieres confirmar el préstamo de <strong>{datosAccion.p.insumos?.nombre} (x{datosAccion.p.cantidad})</strong> al usuario <strong>{datosAccion.p.reservas?.usuarios?.nombres}</strong> para el día <strong>{formatearFecha(datosAccion.p.reservas?.fecha_evento)}</strong>?
                        </p>

                        <div style={styles.botonesModal}>
                            <button onClick={() => setIsModalConfirmacionAbierto(false)} style={styles.btnSecundario}>Cancelar</button>
                            <button onClick={confirmarEntrega} disabled={procesando} style={styles.btnPrimario}>
                                {procesando ? 'Procesando...' : 'Sí, Confirmar'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal de Justificación (Rechazo / Daño) */}
            {isModalJustificacionAbierto && (
                <Modal isOpen={isModalJustificacionAbierto} onClose={() => setIsModalJustificacionAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <h2 style={styles.modalTitulo}>{datosAccion.titulo}</h2>
                        <p style={styles.modalSub}>Por favor, ingresa el motivo o detalles de esta acción.</p>
                        
                        <textarea 
                            style={styles.textarea}
                            placeholder="Escribe aquí los detalles..."
                            value={justificacion}
                            onChange={(e) => setJustificacion(e.target.value)}
                        />

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

const styles = {
    container: { padding: '2rem' },
    header: { marginBottom: '2rem' },
    titulo: { fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', margin: 0 },
    subtitulo: { color: '#64748B', marginTop: '0.5rem' },
    tabs: { display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' },
    tab: { background: 'none', border: 'none', color: '#64748B', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' },
    tabActive: { background: 'none', border: 'none', color: '#6366F1', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700', borderBottom: '2px solid #6366F1' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
    card: { backgroundColor: '#FFFFFF', borderRadius: '0.75rem', border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeader: { display: 'flex', gap: '1rem', alignItems: 'flex-start' },
    iconBox: { padding: '0.75rem', backgroundColor: '#EEF2FF', borderRadius: '0.5rem' },
    insumoNombre: { fontSize: '1.125rem', fontWeight: '700', color: '#1E293B', margin: 0 },
    reservaInfo: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
    cardBody: { flex: 1 },
    fecha: { fontSize: '0.875rem', color: '#1E293B', marginBottom: '0.5rem' },
    obsBox: { display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#475569', border: '1px solid #E2E8F0', marginBottom: '0.5rem' },
    cardActions: { display: 'flex', gap: '0.75rem', marginTop: '0.5rem' },
    btnApprove: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    btnReject: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    btnReturn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#3B82F6', color: '#FFFFFF', border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    btnDamage: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#F59E0B', color: '#FFFFFF', border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    loading: { textAlign: 'center', padding: '4rem', color: '#64748B' },
    empty: { textAlign: 'center', padding: '4rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '0.75rem' },
    modalContenido: { padding: '2rem' },
    modalTitulo: { fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', margin: 0 },
    modalSub: { fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem', marginTop: '0.5rem' },
    textarea: { width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', resize: 'none' },
    botonesModal: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' },
    btnSecundario: { backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' },
    btnPrimario: { backgroundColor: '#6366F1', color: '#FFFFFF', border: 'none', padding: '0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }
};

export default GestionPrestamos;
