/**
 * CalendarioReservas.jsx
 * ─────────────────────────────────────────────────────────
 * Vista mensual de calendario con reservas aprobadas.
 */

import { useState, useEffect } from 'react';
import { useReservas } from '../hooks/useReservas';
import { useAuth } from '../context/AuthContext';
import CalendarioMes from '../components/ui/CalendarioMes';
import { X, Calendar as CalendarIcon, MapPin, Clock, Users, Info } from 'lucide-react';

const CalendarioReservas = () => {
    const { user } = useAuth();
    const { obtenerReservasAprobadas } = useReservas();
    const [mesActual, setMesActual] = useState(new Date());
    const [reservasAprobadas, setReservasAprobadas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reservaSeleccionada, setReservaSeleccionada] = useState(null);

    const isAdminOrSupervisor = user?.perfiles?.nombre === 'administrador' || user?.perfiles?.nombre === 'supervisor';

    useEffect(() => {
        cargarReservas();
    }, [mesActual]);

    const cargarReservas = async () => {
        setLoading(true);
        try {
            const datos = await obtenerReservasAprobadas(mesActual);
            setReservasAprobadas(datos);
        } finally {
            setLoading(false);
        }
    };

    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div style={styles.container}>
            <div style={styles.contenedor}>
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>Calendario de Reservas</h1>
                        <p style={styles.subtitulo}>Consulta la disponibilidad y eventos programados.</p>
                    </div>
                </header>

                <div style={styles.layout}>
                    <div style={styles.seccionCalendario}>
                        {loading ? (
                            <div style={styles.cargando}>Cargando calendario...</div>
                        ) : (
                            <CalendarioMes
                                reservas={reservasAprobadas}
                                onSelectReserva={(reserva) => {
                                    if (isAdminOrSupervisor) {
                                        setReservaSeleccionada(reserva);
                                    }
                                }}
                                user={user}
                            />
                        )}
                    </div>

                    {reservaSeleccionada && isAdminOrSupervisor && (
                        <aside style={styles.panelLateral}>
                            <div style={styles.panelEncabezado}>
                                <h2 style={styles.panelTitulo}>Detalle del Evento</h2>
                                <button onClick={() => setReservaSeleccionada(null)} style={styles.botonCerrar}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={styles.panelContenido}>
                                <div style={styles.residenteCard}>
                                    <div style={styles.avatarGrande}>
                                        {reservaSeleccionada.usuarios?.nombres?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 style={styles.nombreResidente}>
                                            {reservaSeleccionada.usuarios?.nombres} {reservaSeleccionada.usuarios?.apellidos}
                                        </h3>
                                        <p style={styles.apto}>Apartamento {reservaSeleccionada.usuarios?.numero_apto}</p>
                                    </div>
                                </div>

                                <div style={styles.infoGrid}>
                                    <div style={styles.infoItem}>
                                        <CalendarIcon size={16} color="var(--primary)" />
                                        <div>
                                            <label style={styles.infoLabel}>Fecha</label>
                                            <p style={styles.infoValue}>{formatearFecha(reservaSeleccionada.fecha_evento)}</p>
                                        </div>
                                    </div>
                                    <div style={styles.infoItem}>
                                        <Clock size={16} color="var(--primary)" />
                                        <div>
                                            <label style={styles.infoLabel}>Horario</label>
                                            <p style={styles.infoValue}>{reservaSeleccionada.hora_inicio} - {reservaSeleccionada.hora_fin}</p>
                                        </div>
                                    </div>
                                    <div style={styles.infoItem}>
                                        <Users size={16} color="var(--primary)" />
                                        <div>
                                            <label style={styles.infoLabel}>Invitados</label>
                                            <p style={styles.infoValue}>{reservaSeleccionada.numero_invitados} personas</p>
                                        </div>
                                    </div>
                                    <div style={styles.infoItem}>
                                        <Info size={16} color="var(--primary)" />
                                        <div>
                                            <label style={styles.infoLabel}>Tipo de Evento</label>
                                            <p style={styles.infoValue}>{reservaSeleccionada.tipo_evento}</p>
                                        </div>
                                    </div>
                                </div>

                                {reservaSeleccionada.descripcion && (
                                    <div style={styles.descripcionBox}>
                                        <label style={styles.infoLabel}>Notas Adicionales</label>
                                        <p style={styles.descripcionText}>{reservaSeleccionada.descripcion}</p>
                                    </div>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '2rem', minHeight: '100vh', backgroundColor: '#F8FAFC' },
    contenedor: { maxWidth: '1400px', margin: '0 auto' },
    header: { marginBottom: '2rem' },
    titulo: { fontSize: '2rem', fontWeight: '800', color: '#1E293B', margin: 0 },
    subtitulo: { color: '#64748B', marginTop: '0.5rem' },
    layout: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' },
    seccionCalendario: { flex: 1, backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #E2E8F0', overflow: 'hidden' },
    cargando: { padding: '4rem', textAlign: 'center', color: '#64748B' },
    panelLateral: { width: '380px', backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #E2E8F0', position: 'sticky', top: '2rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
    panelEncabezado: { padding: '1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    panelTitulo: { fontSize: '1.25rem', fontWeight: '700', margin: 0 },
    botonCerrar: { background: '#F1F5F9', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer' },
    panelContenido: { padding: '1.5rem' },
    residenteCard: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '0.75rem' },
    avatarGrande: { width: '48px', height: '48px', borderRadius: '0.5rem', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '800' },
    nombreResidente: { fontSize: '1.125rem', fontWeight: '700', margin: 0 },
    apto: { fontSize: '0.875rem', color: '#64748B', margin: 0 },
    infoGrid: { display: 'grid', gap: '1.25rem' },
    infoItem: { display: 'flex', gap: '1rem', alignItems: 'flex-start' },
    infoLabel: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#94A3B8', display: 'block', marginBottom: '0.25rem' },
    infoValue: { fontSize: '0.9375rem', fontWeight: '600', color: '#1E293B', margin: 0 },
    descripcionBox: { marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #F1F5F9' },
    descripcionText: { fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', margin: 0 }
};

export default CalendarioReservas;
