import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const usePrestamos = () => {
    const [prestamos, setPrestamos] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const fetchPrestamos = async (reservaId = null) => {
        setLoading(true);
        try {
            let query = supabase
                .from('prestamos_insumos')
                .select(`
                    *,
                    insumos (nombre, unidad, cantidad_disponible),
                    reservas (fecha_evento, tipo_evento, usuarios!residente_id (nombres, apellidos, numero_apto))
                `)
                .order('created_at', { ascending: false });

            if (reservaId) {
                query = query.eq('reserva_id', reservaId);
            }

            const { data, error } = await query;
            if (error) throw error;
            setPrestamos(data || []);
        } catch (error) {
            console.error('Error fetching prestamos:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const solicitarPrestamo = async (prestamoData) => {
        try {
            // 1. Verificar disponibilidad actual en tiempo real
            const { data: insumo, error: insumoErr } = await supabase
                .from('insumos')
                .select('nombre, cantidad_disponible')
                .eq('id', prestamoData.insumo_id)
                .single();

            if (insumoErr) throw insumoErr;

            if (insumo.cantidad_disponible < prestamoData.cantidad) {
                return { 
                    success: false, 
                    error: `No hay suficientes unidades de "${insumo.nombre}". Disponibles: ${insumo.cantidad_disponible}` 
                };
            }

            // 2. Proceder con la solicitud
            const { data, error } = await supabase
                .from('prestamos_insumos')
                .insert([prestamoData])
                .select();
            
            if (error) throw error;

            if (error) throw error;

            // 3. Notificar a administradores y supervisores
            const { data: todosLosUsuarios } = await supabase
                .from('usuarios')
                .select('id, perfiles(nombre)');

            const usersNotif = todosLosUsuarios?.filter(u => {
                const p = Array.isArray(u.perfiles) ? u.perfiles[0] : u.perfiles;
                return p?.nombre === 'administrador' || p?.nombre === 'supervisor';
            });

            if (usersNotif && usersNotif.length > 0) {
                const { data: userData } = await supabase.from('usuarios').select('nombres, apellidos').eq('id', user.id).single();
                const nombreResidente = userData ? `${userData.nombres} ${userData.apellidos}` : 'Un residente';

                const notifs = usersNotif.map(u => ({
                    usuario_id: u.id,
                    titulo: 'Nueva Solicitud de Insumos',
                    mensaje: `${nombreResidente} ha solicitado ${prestamoData.cantidad} ${insumo.nombre}.`,
                    tipo: 'info',
                    vinculo: '/admin/prestamos'
                }));
                await supabase.from('notificaciones').insert(notifs);
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const actualizarEstadoPrestamo = async (id, nuevoEstado, observaciones = '', fecha = null) => {
        try {
            // 1. Obtener el estado actual antes de actualizar para saber si debemos ajustar inventario
            const { data: pActual } = await supabase
                .from('prestamos_insumos')
                .select('insumo_id, cantidad, estado')
                .eq('id', id)
                .single();

            const updateData = { 
                estado: nuevoEstado, 
                updated_at: new Date() 
            };
            
            if (nuevoEstado === 'entregado') {
                updateData.fecha_prestamo = fecha || new Date();
                updateData.observaciones_admin = observaciones;
            } else if (nuevoEstado === 'devuelto' || nuevoEstado === 'danado') {
                updateData.fecha_devolucion = fecha || new Date();
                updateData.observaciones_admin = observaciones;
            }

            const { error } = await supabase
                .from('prestamos_insumos')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Crear notificación para el residente sobre el cambio de estado
            const { data: prestamoInfo } = await supabase
                .from('prestamos_insumos')
                .select(`
                    id, 
                    cantidad, 
                    insumos (nombre), 
                    reservas (residente_id, tipo_evento)
                `)
                .eq('id', id)
                .single();

            if (prestamoInfo) {
                let titulo = '';
                let mensaje = '';
                let tipo = 'info';

                if (nuevoEstado === 'entregado') {
                    titulo = 'Préstamo Aprobado';
                    mensaje = `Tu solicitud de ${prestamoInfo.cantidad} ${prestamoInfo.insumos.nombre} para "${prestamoInfo.reservas.tipo_evento}" ha sido aprobada.`;
                    tipo = 'success';
                } else if (nuevoEstado === 'rechazado') {
                    titulo = 'Préstamo Rechazado';
                    mensaje = `Tu solicitud de ${prestamoInfo.insumos.nombre} ha sido rechazada. Motivo: ${observaciones || 'No especificado'}.`;
                    tipo = 'error';
                } else if (nuevoEstado === 'danado') {
                    titulo = 'Reporte de Daño Registrado';
                    mensaje = `Se ha registrado un daño en ${prestamoInfo.insumos.nombre}. Por favor, contacta a administración.`;
                    tipo = 'warning';
                }

                if (titulo) {
                    await supabase.from('notificaciones').insert([{
                        usuario_id: prestamoInfo.reservas.residente_id,
                        titulo,
                        mensaje,
                        tipo,
                        vinculo: '/reservas'
                    }]);
                }
            }

            // Actualización de Inventario
            if (pActual) {
                const { data: insumo } = await supabase.from('insumos').select('cantidad_disponible').eq('id', pActual.insumo_id).single();
                
                if (insumo) {
                    let nuevaCantidad = insumo.cantidad_disponible;

                    // Si se ENTREGA: Se resta del stock (solo si no estaba ya entregado)
                    if (nuevoEstado === 'entregado' && pActual.estado !== 'entregado') {
                        nuevaCantidad -= pActual.cantidad;
                    } 
                    // Si se DEVUELVE o CANCELA: Se suma al stock (solo si estaba entregado)
                    else if ((nuevoEstado === 'devuelto' || nuevoEstado === 'cancelado') && pActual.estado === 'entregado') {
                        nuevaCantidad += pActual.cantidad;
                    }

                    if (nuevaCantidad !== insumo.cantidad_disponible) {
                        await supabase.from('insumos').update({ cantidad_disponible: nuevaCantidad }).eq('id', pActual.insumo_id);
                    }
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const reportarDanio = async (id, observaciones) => {
        try {
            const { error } = await supabase
                .from('prestamos_insumos')
                .update({ 
                    estado: 'danado', 
                    observaciones_residente: observaciones,
                    fecha_devolucion: new Date(),
                    updated_at: new Date()
                })
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return {
        prestamos,
        loading,
        fetchPrestamos,
        solicitarPrestamo,
        actualizarEstadoPrestamo,
        reportarDanio
    };
};
