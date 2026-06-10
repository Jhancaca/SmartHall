/**
 * CalendarioMes.jsx
 * ─────────────────────────────────────────────────────────
 * Componente calendario mensual puro que muestra las reservas aprobadas.
 * 
 * Características:
 *  - Grid de 7 columnas (dom–sab)
 *  - Días con reserva muestran pastilla con tipo de evento y apartamento
 *  - Al hacer clic en una pastilla, abre un panel con detalles
 *  - Sin dependencias de librerías de calendario externas
 * 
 * Props:
 *  - reservas: Array de objetos de reserva con campos: id, fecha_evento, tipo_evento,
 *    usuarios: { nombres, apellidos, numero_apto }
 *  - onSelectReserva: Callback al seleccionar una reserva (solo admin/supervisor).
 *  - user: Objeto del usuario actual con { perfiles: { nombre } } para determinar permisos.
 * 
 * Comportamiento por rol:
 *  - Administrador/Supervisor: Puede hacer clic en las pastillas para ver detalles.
 *  - Residente: Solo ve "Día reservado" sin interacción.
 *
 * @module components/ui/CalendarioMes
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

/**
 * CalendarioMes
 * Componente de calendario mensual con visualización de reservas aprobadas.
 *
 * @param {Object} props
 * @param {Array} props.reservas - Lista de reservas aprobadas del mes a mostrar.
 * @param {Function} props.onSelectReserva - Callback al hacer clic en una reserva (solo admin/supervisor).
 * @param {Object} props.user - Usuario actual con info de perfil para determinar rol.
 */
const CalendarioMes = ({ reservas, onSelectReserva, user }) => {
    // Estado del mes actualmente visualizado
    const [mesActual, setMesActual] = useState(new Date());
    // Determinar si el usuario actual es administrador o supervisor (para permisos de interacción)
    const isAdminOrSupervisor = user?.perfiles?.nombre === 'administrador' || user?.perfiles?.nombre === 'supervisor';

    /**
     * getNombresMeses
     * Retorna array con los nombres de los meses en español para el encabezado del calendario.
     * @returns {string[]} Array de 12 meses en español.
     */
    const getNombresMeses = () => [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    /**
     * getNombresDias
     * Retorna array con los nombres abreviados de los días de la semana.
     * @returns {string[]} Array de 7 días (Dom–Sáb).
     */
    const getNombresDias = () => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Cálculo de fechas para la grilla del calendario
    const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1); // Primer día del mes
    const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0); // Último día del mes
    const diaInicio = primerDia.getDay(); // Día de la semana del primer día (0=Dom, 6=Sáb)
    const diasEnMes = ultimoDia.getDate(); // Cantidad de días en el mes actual

    const diasAnterior = new Date(mesActual.getFullYear(), mesActual.getMonth(), 0).getDate(); // Último día del mes anterior
    const diasCeldas = []; // Array que contiene todas las 42 celdas del calendario (6 filas × 7 columnas)

    // Generar celdas para los días del mes anterior (para completar la primera semana)
    for (let i = diasAnterior - diaInicio + 1; i <= diasAnterior; i++) {
        diasCeldas.push({
            dia: i,
            mes: mesActual.getMonth() - 1,
            ano: mesActual.getFullYear(),
            esOtroMes: true // Marca visual para mostrar en gris
        });
    }

    // Generar celdas para los días del mes actual
    for (let i = 1; i <= diasEnMes; i++) {
        diasCeldas.push({
            dia: i,
            mes: mesActual.getMonth(),
            ano: mesActual.getFullYear(),
            esOtroMes: false
        });
    }

    // Generar celdas para completar la grilla (hasta 42 celdas = 6 semanas)
    const diasRestantes = 42 - diasCeldas.length;
    for (let i = 1; i <= diasRestantes; i++) {
        diasCeldas.push({
            dia: i,
            mes: mesActual.getMonth() + 1,
            ano: mesActual.getFullYear(),
            esOtroMes: true // Marca visual para mostrar en gris
        });
    }

    /**
     * obtenerReservasDia
     * Filtra las reservas aprobadas por una fecha específica.
     * Compara el campo fecha_evento (formato YYYY-MM-DD) con la fecha de la celda.
     *
     * @param {number} dia - Día del mes (1-31).
     * @param {number} mes - Mes (0-11, formato JavaScript).
     * @param {number} ano - Año completo (ej: 2026).
     * @returns {Array} Reservas que coinciden con la fecha especificada.
     */
    const obtenerReservasDia = (dia, mes, ano) => {
        // Formatear fecha a YYYY-MM-DD para comparar con el campo fecha_evento de la BD
        const fechaStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        return reservas.filter(r => r.fecha_evento === fechaStr);
    };

    /** Navegar al mes anterior */
    const irAlMesAnterior = () => {
        setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1));
    };

    /** Navegar al mes siguiente */
    const irAlMesSiguiente = () => {
        setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1));
    };

    return (
        <div style={styles.container}>
            {/* Encabezado: Mes/Año + Navegación */}
            <div style={styles.header}>
                <button onClick={irAlMesAnterior} style={styles.btnNav}>
                    <ChevronLeft size={20} />
                </button>
                <h2 style={styles.mes}>
                    {getNombresMeses()[mesActual.getMonth()]} {mesActual.getFullYear()}
                </h2>
                <button onClick={irAlMesSiguiente} style={styles.btnNav}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Grid: Nombres de días */}
            <div style={styles.gridDias}>
                {getNombresDias().map(dia => (
                    <div key={dia} style={styles.encabezadoDia}>
                        {dia}
                    </div>
                ))}
            </div>

            {/* Grid: Celdas de días */}
            <div style={styles.gridCeldas}>
                {diasCeldas.map((celda, idx) => {
                    const reservasDia = obtenerReservasDia(celda.dia, celda.mes, celda.ano);
                    const esHoy =
                        celda.dia === new Date().getDate() &&
                        celda.mes === new Date().getMonth() &&
                        celda.ano === new Date().getFullYear();

                    return (
                        <div
                            key={idx}
                            style={{
                                ...styles.celda,
                                backgroundColor: celda.esOtroMes ? '#F8FAFC' : '#FFFFFF',
                                borderColor: esHoy ? '#2563EB' : '#E2E8F0',
                                borderWidth: esHoy ? '2px' : '1px'
                            }}
                        >
                            <div style={styles.numDia}>{celda.dia}</div>
                            <div style={styles.reservasEnDia}>
                                {reservasDia.map(reserva => (
                                    <button
                                        key={reserva.id}
                                        onClick={() => onSelectReserva && onSelectReserva(reserva)}
                                        disabled={!isAdminOrSupervisor}
                                        style={{
                                            ...styles.pastillaReserva,
                                            backgroundColor: isAdminOrSupervisor ? '#EFF6FF' : '#FEE2E2',
                                            borderColor: isAdminOrSupervisor ? '#2563EB' : '#EF4444',
                                            color: isAdminOrSupervisor ? '#1E40AF' : '#991B1B',
                                            cursor: isAdminOrSupervisor ? 'pointer' : 'default',
                                            padding: isAdminOrSupervisor ? '0.5rem' : '0.25rem 0.5rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                <span style={styles.labelEstado}>
                                                    {isAdminOrSupervisor 
                                                        ? `Reservado por ${reserva.usuarios?.nombres}` 
                                                        : 'Día reservado'}
                                                </span>
                                                {isAdminOrSupervisor && (
                                                    <span style={styles.subLabel}>
                                                        Apto {reserva.usuarios?.numero_apto} • {reserva.tipo_evento}
                                                    </span>
                                                )}
                                            </div>
                                            {isAdminOrSupervisor && <Eye size={14} style={{ flexShrink: 0, marginLeft: '4px' }} />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
    },
    mes: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#1E293B',
        margin: 0
    },
    btnNav: {
        background: 'none',
        border: '1px solid #E2E8F0',
        borderRadius: '0.375rem',
        padding: '0.5rem',
        cursor: 'pointer',
        color: '#64748B',
        transition: 'all 0.2s',
        ':hover': {
            backgroundColor: '#F1F5F9',
            color: '#1E293B'
        }
    },
    gridDias: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        marginBottom: '0.5rem'
    },
    encabezadoDia: {
        textAlign: 'center',
        fontWeight: '600',
        color: '#64748B',
        fontSize: '0.875rem',
        padding: '0.5rem'
    },
    gridCeldas: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        backgroundColor: '#E2E8F0',
        borderRadius: '0.375rem',
        overflow: 'hidden'
    },
    celda: {
        minHeight: '120px',
        padding: '0.5rem',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
    },
    numDia: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: '0.25rem'
    },
    reservasEnDia: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        flex: 1,
        overflow: 'hidden'
    },
    pastillaReserva: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.625rem',
        padding: '0.25rem 0.375rem',
        borderRadius: '0.25rem',
        border: '1px solid',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: 'none',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    tipoEvento: {
        fontWeight: '600'
    },
    labelEstado: {
        fontWeight: '700',
        fontSize: '0.75rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    subLabel: {
        fontSize: '0.625rem',
        opacity: 0.8,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    apto: {
        fontSize: '0.5rem',
        opacity: 0.8
    }
};

export default CalendarioMes;
