/**
 * CalendarioReservas.jsx
 * ─────────────────────────────────────────────────────────
 * Página que muestra un calendario mensual interactivo con todas las reservas
 * aprobadas del sistema. Permite a los usuarios (especialmente administradores
 * y supervisores) visualizar la disponibilidad y ver detalles de eventos
 * programados en el salón comunal.
 * 
 * Hooks utilizados:
 * - useState: para gestionar el mes actual, reservas, estado de carga y reserva seleccionada
 * - useEffect: para cargar las reservas cuando cambia el mes seleccionado
 * 
 * Contextos utilizados:
 * - useAuth: para obtener el usuario actual y verificar su perfil/rol
 * 
 * APIs/Hooks personalizados:
 * - useReservas: para obtener las reservas aprobadas del mes actual
 * 
 * Componentes renderizados:
 * - CalendarioMes: componente de calendario mensual que muestra las reservas
 * - Panel lateral de detalles: se muestra cuando un administrador/supervisor selecciona una reserva
 */

import { useState, useEffect } from 'react';
import { useReservas } from '../hooks/useReservas';
import { useAuth } from '../context/AuthContext';
import CalendarioMes from '../components/ui/CalendarioMes';
import { X, Calendar as CalendarIcon, MapPin, Clock, Users, Info } from 'lucide-react';

/**
 * Componente principal de la página de Calendario de Reservas.
 * Muestra un calendario mensual con las reservas aprobadas y permite
 * a los administradores/supervisores ver detalles de eventos seleccionados.
 * 
 * @returns {JSX.Element} Página completa del calendario de reservas con
 * header, calendario mensual y panel lateral de detalles (para admin/supervisor).
 */
const CalendarioReservas = () => {
    // Hooks de contexto y personalizados
    const { user } = useAuth(); // Usuario actual autenticado (contiene información de perfil)
    const { obtenerReservasAprobadas } = useReservas(); // Función para obtener reservas aprobadas del mes

    // Estado del componente
    const [mesActual, setMesActual] = useState(new Date()); // Mes actual seleccionado en el calendario (Date object)
    const [reservasAprobadas, setReservasAprobadas] = useState([]); // Lista de reservas aprobadas para el mes actual
    const [loading, setLoading] = useState(true); // Estado de carga de las reservas
    const [reservaSeleccionada, setReservaSeleccionada] = useState(null); // Reserva seleccionada para ver detalles (solo admin/supervisor)

    // Valor derivado: verifica si el usuario actual es administrador o supervisor
    const isAdminOrSupervisor = user?.perfiles?.nombre === 'administrador' || user?.perfiles?.nombre === 'supervisor';

    /**
     * Efecto que carga las reservas aprobadas cada vez que cambia el mes seleccionado.
     * Se ejecuta al montar el componente y cuando el usuario navega a otro mes.
     */
    useEffect(() => {
        cargarReservas();
    }, [mesActual]);

    /**
     * Carga las reservas aprobadas para el mes actual desde la API.
     * Actualiza el estado de reservasAprobadas y controla el estado de carga.
     * 
     * @async
     * @function cargarReservas
     * @returns {Promise<void>} No retorna valor, actualiza estado interno.
     */
    const cargarReservas = async () => {
        setLoading(true);
        try {
            const datos = await obtenerReservasAprobadas(mesActual);
            setReservasAprobadas(datos);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Formatea una fecha en formato legible en español con día de la semana,
     * día del mes, mes y año completo.
     * 
     * @function formatearFecha
     * @param {string|Date} fecha - Fecha a formatear (puede ser string ISO o Date)
     * @returns {string} Fecha formateada en español (ej: "lunes, 10 de junio de 2026")
     */
    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    /**
     * Renderiza la interfaz del calendario de reservas.
     * Estructura principal:
     * 1. Header con título y subtítulo
     * 2. Layout de dos columnas:
     *    - Columna izquierda: Calendario mensual (CalendarioMes)
     *    - Columna derecha: Panel lateral de detalles (solo visible para admin/supervisor)
     * 
     * El calendario muestra las reservas aprobadas del mes actual.
     * El panel lateral muestra información detallada de la reserva seleccionada.
     * 
     * @returns {JSX.Element} Estructura JSX del calendario de reservas
     */
    return (
        <div style={styles.container}>
            <div style={styles.contenedor}>
                {/* Encabezado de la página con título y subtítulo */}
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>Calendario de Reservas</h1>
                        <p style={styles.subtitulo}>Consulta la disponibilidad y eventos programados.</p>
                    </div>
                </header>

                {/* Layout principal: calendario a la izquierda, panel de detalles a la derecha */}
                <div style={styles.layout}>
                    {/* Sección del calendario mensual */}
                    <div style={styles.seccionCalendario}>
                        {loading ? (
                            /* Indicador de carga mientras se obtienen las reservas */
                            <div style={styles.cargando}>Cargando calendario...</div>
                        ) : (
                            /* Componente de calendario mensual que muestra las reservas aprobadas */
                            <CalendarioMes
                                reservas={reservasAprobadas} // Lista de reservas aprobadas del mes
                                onSelectReserva={(reserva) => {
                                    // Solo permite seleccionar reserva si el usuario es admin o supervisor
                                    if (isAdminOrSupervisor) {
                                        setReservaSeleccionada(reserva);
                                    }
                                }}
                                user={user} // Usuario actual para verificación de permisos
                            />
                        )}
                    </div>

                    {/* Panel lateral de detalles - solo visible para admin/supervisor cuando hay reserva seleccionada */}
                    {reservaSeleccionada && isAdminOrSupervisor && (
                        <aside style={styles.panelLateral}>
                            {/* Encabezado del panel con título y botón de cerrar */}
                            <div style={styles.panelEncabezado}>
                                <h2 style={styles.panelTitulo}>Detalle del Evento</h2>
                                <button onClick={() => setReservaSeleccionada(null)} style={styles.botonCerrar}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Contenido del panel con información de la reserva */}
                            <div style={styles.panelContenido}>
                                {/* Tarjeta con información del residente que hizo la reserva */}
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

                                {/* Grid con información detallada del evento */}
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

                                {/* Sección de notas adicionales (solo si existe descripción) */}
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

/**
 * Estilos del componente CalendarioReservas.
 * Utiliza estilos en línea para mantener coherencia con el diseño del proyecto.
 * Define estilos para el contenedor principal, header, layout de dos columnas,
 * calendario, panel lateral de detalles, y elementos de información.
 */
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
