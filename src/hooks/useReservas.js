/**
 * useReservas.js
 * ─────────────────────────────────────────────────────────
 * Hook personalizado para la gestión de reservas en SmartHall.
 * 
 * Centraliza la interacción con la tabla 'reservas':
 *  - Carga el listado de reservas (filtrado por rol del usuario).
 *  - Crea nuevas reservas con validación.
 *  - Actualiza estado de reservas (aprobar, rechazar, cancelar).
 *  - Verifica disponibilidad de fechas.
 *  - Obtiene movimientos de reserva por rango de fechas.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useReservas = () => {
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * fetchReservas
     * Obtiene todas las reservas (para admin/supervisor) o solo las del usuario actual.
     * 
     * @param {string|null} residenteId - UUID del residente. Si se pasa, filtra por ese residente
     * @param {string|null} filtroEstado - Filtra por estado (pendiente, aprobada, etc.)
     * @param {Date|null} fechaDesde - Rango de fechas desde
     * @param {Date|null} fechaHasta - Rango de fechas hasta
     */
    const fetchReservas = useCallback(async (residenteId = null, filtroEstado = null, fechaDesde = null, fechaHasta = null) => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('reservas')
                .select(`
                    *,
                    usuarios:residente_id (
                        id,
                        nombres,
                        apellidos,
                        numero_apto,
                        email
                    ),
                    revisado_por_user:revisado_por (
                        id,
                        nombres,
                        apellidos
                    )
                `)
                .order('fecha_evento', { ascending: false });

            // Filtrar por residente si se especifica
            if (residenteId) {
                query = query.eq('residente_id', residenteId);
            }

            // Filtrar por estado si se especifica
            if (filtroEstado) {
                query = query.eq('estado', filtroEstado);
            }

            // Filtrar por rango de fechas si se especifica
            if (fechaDesde) {
                query = query.gte('fecha_evento', fechaDesde);
            }
            if (fechaHasta) {
                query = query.lte('fecha_evento', fechaHasta);
            }

            const { data, error: err } = await query;

            if (err) throw err;
            setReservas(data || []);
            return { success: true, data };
        } catch (err) {
            console.error('Error fetching reservas:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * verificarDisponibilidad
     * Llama a la función RPC de Supabase para validar reglas de negocio.
     * 
     * @param {string} fecha - Fecha en formato YYYY-MM-DD
     * @param {string|null} reservaId - UUID de la reserva a actualizar (NULL si es nueva)
     * @returns {Object} { disponible: boolean, mensaje: string }
     */
    const verificarDisponibilidad = useCallback(async (fecha, reservaId = null) => {
        try {
            const { data, error: err } = await supabase
                .rpc('verificar_disponibilidad_reserva', {
                    p_fecha: fecha,
                    p_reserva_id: reservaId
                });

            if (err) throw err;
            return data;
        } catch (err) {
            console.error('Error verificando disponibilidad:', err);
            return {
                disponible: false,
                mensaje: 'Error al verificar disponibilidad'
            };
        }
    }, []);

    /**
     * Suscripción Realtime para Reservas
     */
    useEffect(() => {
        const channel = supabase
            .channel('public:reservas')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservas' },
                (payload) => {
                    // Recargar la lista automáticamente ante cualquier cambio
                    fetchReservas();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchReservas]);

    /**
     * createReserva
     */
    const createReserva = useCallback(async (datosReserva) => {
        try {
            const validacion = await verificarDisponibilidad(datosReserva.fecha_evento, null);
            if (!validacion.disponible) {
                return { success: false, error: validacion.mensaje };
            }

            const { data, error: err } = await supabase
                .from('reservas')
                .insert({ ...datosReserva, estado: 'pendiente' })
                .select()
                .single();

            if (err) throw err;

            // Notificar a administradores y supervisores
            const { data: todosLosUsuarios } = await supabase
                .from('usuarios')
                .select('id, perfiles(nombre)');

            const usersNotif = todosLosUsuarios?.filter(u => {
                const p = Array.isArray(u.perfiles) ? u.perfiles[0] : u.perfiles;
                return p?.nombre === 'administrador' || p?.nombre === 'supervisor';
            });

            if (usersNotif && usersNotif.length > 0) {
                // Obtener nombre del residente para el mensaje
                const { data: residente } = await supabase
                    .from('usuarios')
                    .select('nombres, apellidos')
                    .eq('id', datosReserva.residente_id)
                    .single();

                const nombreResidente = residente ? `${residente.nombres} ${residente.apellidos}` : 'Un residente';

                const notifs = usersNotif.map(u => ({
                    usuario_id: u.id,
                    titulo: 'Nueva Solicitud de Reserva',
                    mensaje: `${nombreResidente} ha solicitado una reserva para el ${datosReserva.fecha_evento}.`,
                    tipo: 'info',
                    vinculo: '/admin/aprobaciones'
                }));
                await supabase.from('notificaciones').insert(notifs);
            }

            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [verificarDisponibilidad]);

    /**
     * aprobarReserva
     */
    const aprobarReserva = useCallback(async (reservaId, revisorId) => {
        try {
            const { data, error: err } = await supabase
                .from('reservas')
                .update({
                    estado: 'aprobada',
                    revisado_por: revisorId,
                    fecha_revision: new Date().toISOString()
                })
                .eq('id', reservaId)
                .select();

            if (err) throw err;
            const res = data?.[0];

            if (res) {
                // Notificar al residente
                await supabase.from('notificaciones').insert([{
                    usuario_id: res.residente_id,
                    titulo: 'Reserva Aprobada',
                    mensaje: `Tu reserva para el ${res.fecha_evento} ha sido aprobada con éxito.`,
                    tipo: 'success',
                    metadata: { reserva_id: res.id }
                }]);
            }

            return { success: true, data: res };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    /**
     * rechazarReserva
     */
    const rechazarReserva = useCallback(async (reservaId, revisorId, motivo) => {
        try {
            if (!motivo || motivo.trim() === '') {
                return { success: false, error: 'El motivo de rechazo es obligatorio.' };
            }

            const { data, error: err } = await supabase
                .from('reservas')
                .update({
                    estado: 'rechazada',
                    revisado_por: revisorId,
                    fecha_revision: new Date().toISOString(),
                    motivo_rechazo: motivo
                })
                .eq('id', reservaId)
                .select();

            if (err) throw err;
            const res = data?.[0];

            if (res) {
                // Notificar al residente
                await supabase.from('notificaciones').insert([{
                    usuario_id: res.residente_id,
                    titulo: 'Reserva Rechazada',
                    mensaje: `Lo sentimos, tu reserva para el ${res.fecha_evento} ha sido rechazada. Motivo: ${motivo}`,
                    tipo: 'error',
                    metadata: { reserva_id: res.id }
                }]);
            }

            return { success: true, data: res };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    /**
     * cancelarReserva
     * Cancela una reserva pendiente (el residente cancela la suya).
     * 
     * @param {string} reservaId - UUID de la reserva
     */
    const cancelarReserva = useCallback(async (reservaId, motivo = null) => {
        try {
            const { data, error: err } = await supabase
                .from('reservas')
                .update({
                    estado: 'cancelada',
                    motivo_cancelacion: motivo // Asegúrate de que esta columna existe
                })
                .eq('id', reservaId)
                .select();

            if (err) throw err;
            const res = data?.[0];

            if (res) {
                // 1. Notificar al residente sobre la cancelación
                await supabase.from('notificaciones').insert([{
                    usuario_id: res.residente_id,
                    titulo: 'Reserva Cancelada',
                    mensaje: `Tu reserva para el ${res.fecha_evento} ha sido cancelada.`,
                    tipo: 'warning',
                    vinculo: '/reservas'
                }]);

                // 2. Recuperar stock e inventario si había préstamos
                const { data: prestamosAsociados } = await supabase
                    .from('prestamos_insumos')
                    .select('id, insumo_id, cantidad, estado')
                    .eq('reserva_id', reservaId);

                if (prestamosAsociados) {
                    for (const p of prestamosAsociados) {
                        if (p.estado === 'entregado') {
                            const { data: insumo } = await supabase
                                .from('insumos')
                                .select('cantidad_disponible')
                                .eq('id', p.insumo_id)
                                .single();
                            
                            if (insumo) {
                                await supabase
                                    .from('insumos')
                                    .update({ cantidad_disponible: insumo.cantidad_disponible + p.cantidad })
                                    .eq('id', p.insumo_id);
                            }
                        }
                    }
                    await supabase.from('prestamos_insumos').delete().eq('reserva_id', reservaId);
                }

                // 3. Notificar a administradores/supervisores
                const { data: todosLosUsuarios } = await supabase.from('usuarios').select('id, perfiles(nombre)');
                const admins = todosLosUsuarios?.filter(u => {
                    const p = Array.isArray(u.perfiles) ? u.perfiles[0] : u.perfiles;
                    return p?.nombre === 'administrador' || p?.nombre === 'supervisor';
                });

                if (admins && admins.length > 0) {
                    const { data: residente } = await supabase.from('usuarios').select('nombres, apellidos').eq('id', res.residente_id).single();
                    const nombreResidente = residente ? `${residente.nombres} ${residente.apellidos}` : 'Un residente';

                    const notifs = admins.map(u => ({
                        usuario_id: u.id,
                        titulo: 'Reserva Cancelada por Residente',
                        mensaje: `${nombreResidente} ha cancelado su reserva del ${res.fecha_evento}.`,
                        tipo: 'info',
                        vinculo: '/admin/reservas'
                    }));
                    await supabase.from('notificaciones').insert(notifs);
                }
            }

            await fetchReservas(); // Actualizar lista
            return { success: true, data: res };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [fetchReservas]);

    /**
     * obtenerReservasAprobadas
     * Obtiene todas las reservas aprobadas en un rango de fechas (para el calendario).
     * 
     * @param {Date} mesActual - Mes a mostrar
     * @returns {Array} Lista de reservas aprobadas
     */
    const obtenerReservasAprobadas = useCallback(async (mesActual) => {
        try {
            const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
            const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);

            const { data, error: err } = await supabase
                .from('reservas')
                .select(`
          *,
          usuarios!residente_id (
            nombres,
            apellidos,
            numero_apto
          )
        `)
                .eq('estado', 'aprobada')
                .gte('fecha_evento', primerDia.toISOString().split('T')[0])
                .lte('fecha_evento', ultimoDia.toISOString().split('T')[0])
                .order('fecha_evento', { ascending: true });

            if (err) throw err;
            return data || [];
        } catch (err) {
            console.error('Error obteniendo reservas aprobadas:', err);
            return [];
        }
    }, []);

    /**
     * obtenerReservasPendientes
     * Obtiene el conteo de reservas pendientes para mostrar en KPI.
     */
    const obtenerReservasPendientes = useCallback(async () => {
        try {
            const { count, error: err } = await supabase
                .from('reservas')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'pendiente');

            if (err) throw err;
            return count || 0;
        } catch (err) {
            console.error('Error obteniendo reservas pendientes:', err);
            return 0;
        }
    }, []);

    /**
     * obtenerEstadisticasMensuales
     * Obtiene el resumen de reservas (aceptadas, rechazadas, pendientes) del mes actual.
     */
    const obtenerEstadisticasMensuales = useCallback(async () => {
        try {
            const ahora = new Date();
            const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
            const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0];

            const { data, error: err } = await supabase
                .from('reservas')
                .select('estado')
                .gte('fecha_evento', primerDia)
                .lte('fecha_evento', ultimoDia);

            if (err) throw err;

            const stats = {
                aprobadas: data.filter(r => r.estado === 'aprobada').length,
                rechazadas: data.filter(r => r.estado === 'rechazada').length,
                pendientes: data.filter(r => r.estado === 'pendiente').length
            };

            return stats;
        } catch (err) {
            console.error('Error obteniendo estadísticas:', err);
            return { aprobadas: 0, rechazadas: 0, pendientes: 0 };
        }
    }, []);

    /**
     * obtenerReservasEsteMes
     * Obtiene el conteo de reservas aprobadas del mes actual (usado en KPIs).
     */
    const obtenerReservasEsteMes = useCallback(async () => {
        try {
            const ahora = new Date();
            const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
            const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0];

            const { count, error: err } = await supabase
                .from('reservas')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'aprobada')
                .gte('fecha_evento', primerDia)
                .lte('fecha_evento', ultimoDia);

            if (err) throw err;
            return count || 0;
        } catch (err) {
            console.error('Error obteniendo reservas de este mes:', err);
            return 0;
        }
    }, []);

    return {
        reservas,
        loading,
        error,
        fetchReservas,
        verificarDisponibilidad,
        createReserva,
        aprobarReserva,
        rechazarReserva,
        cancelarReserva,
        obtenerReservasAprobadas,
        obtenerReservasPendientes,
        obtenerReservasEsteMes,
        obtenerEstadisticasMensuales,
        deleteReserva: async (id) => {
            const { error } = await supabase.from('reservas').delete().eq('id', id);
            if (!error) {
                await fetchReservas();
                return { success: true };
            }
            return { success: false, error: error.message };
        }
    };
};
