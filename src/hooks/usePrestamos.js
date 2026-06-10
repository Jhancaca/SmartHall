/**
 * usePrestamos.js
 * ─────────────────────────────────────────────────────────
 * Hook personalizado para la gestión de préstamos de insumos en SmartHall.
 *
 * Centraliza toda la lógica de negocio del módulo de inventario y préstamos:
 *  - Consulta de préstamos asociados a reservas con joins a insumos y usuarios.
 *  - Solicitud de préstamo con verificación de stock disponible en tiempo real.
 *  - Flujo de estados: solicitado → entregado → devuelto | danado | cancelado.
 *  - Actualización automática del inventario (stock) según el cambio de estado.
 *  - Notificaciones por cada cambio de estado (al residente y a administradores).
 *
 * Tablas de Supabase involucradas:
 *  - prestamos_insumos: Registro central de préstamos.
 *  - insumos: Catálogo de productos (se actualiza cantidad_disponible).
 *  - usuarios + perfiles: Para identificar residentes y enviar notificaciones.
 *  - notificaciones: Sistema de alertas internas.
 *  - reservas: Contexto del préstamo (fecha_evento, tipo_evento).
 *
 * @module hooks/usePrestamos
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook de gestión de préstamos de insumos.
 * @returns {Object} Estado y funciones para manipular préstamos.
 * @property {Array} prestamos - Lista de préstamos cargados.
 * @property {boolean} loading - Estado de carga de la primera consulta.
 * @property {Function} fetchPrestamos - Carga los préstamos (opcionalmente filtrados por reserva).
 * @property {Function} solicitarPrestamo - Crea un nuevo préstamo con verificación de stock.
 * @property {Function} actualizarEstadoPrestamo - Cambia el estado y ajusta inventario.
 * @property {Function} reportarDanio - Marca un préstamo como dañado.
 */
export const usePrestamos = () => {
    // Estado local para la lista de préstamos y control de carga
    const [prestamos, setPrestamos] = useState([]);
    const [loading, setLoading] = useState(false);
    // Usuario autenticado actual (para identificar quién realiza la solicitud)
    const { user } = useAuth();

    /**
     * fetchPrestamos
     * ─────────────────────────────────────────────────────────
     * Consulta la tabla 'prestamos_insumos' con joins a:
     *  - insumos (nombre, unidad, cantidad_disponible)
     *  - reservas (fecha_evento, tipo_evento, datos del residente)
     *
     * @param {string|null} reservaId - UUID de la reserva para filtrar. Si es null, carga todos.
     * @returns {Promise<void>} Actualiza el estado interno 'prestamos'.
     */
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

    /**
     * solicitarPrestamo
     * ─────────────────────────────────────────────────────────
     * Flujo completo de solicitud de préstamo:
     *  1. Verifica stock actual del insumo consultando la tabla 'insumos'.
     *  2. Si hay stock insuficiente, retorna error con el nombre y cantidad disponible.
     *  3. Inserta el registro en 'prestamos_insumos' con estado inicial 'solicitado'.
     *  4. Consulta todos los usuarios con perfil administrador/supervisor.
     *  5. Inserta notificaciones para cada admin/supervisor informando la solicitud.
     *
     * @param {Object} prestamoData - Datos del préstamo a crear.
     * @param {string} prestamoData.insumo_id - UUID del insumo solicitado.
     * @param {string} prestamoData.reserva_id - UUID de la reserva asociada.
     * @param {number} prestamoData.cantidad - Cantidad solicitada (debe ser ≤ stock disponible).
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>} Resultado de la operación.
     */
    const solicitarPrestamo = async (prestamoData) => {
        try {
            // Paso 1: Verificar disponibilidad actual en tiempo real desde la tabla 'insumos'
            const { data: insumo, error: insumoErr } = await supabase
                .from('insumos')
                .select('nombre, cantidad_disponible')
                .eq('id', prestamoData.insumo_id)
                .single();

            if (insumoErr) throw insumoErr;

            // Validación de stock: comparar cantidad solicitada vs disponible
            if (insumo.cantidad_disponible < prestamoData.cantidad) {
                return { 
                    success: false, 
                    error: `No hay suficientes unidades de "${insumo.nombre}". Disponibles: ${insumo.cantidad_disponible}` 
                };
            }

            // Paso 2: Insertar el préstamo en la base de datos
            const { data, error } = await supabase
                .from('prestamos_insumos')
                .insert([prestamoData])
                .select();
            
            if (error) throw error;

            if (error) throw error;

            // Paso 3: Notificar a administradores y supervisores sobre la nueva solicitud
            // Consultar todos los usuarios del sistema para filtrar por rol
            const { data: todosLosUsuarios } = await supabase
                .from('usuarios')
                .select('id, perfiles(nombre)');

            // Filtrar solo usuarios con rol administrador o supervisor
            const usersNotif = todosLosUsuarios?.filter(u => {
                const p = Array.isArray(u.perfiles) ? u.perfiles[0] : u.perfiles;
                return p?.nombre === 'administrador' || p?.nombre === 'supervisor';
            });

            // Crear notificaciones individuales para cada admin/supervisor
            if (usersNotif && usersNotif.length > 0) {
                // Obtener nombre del residente que solicita para el mensaje de notificación
                const { data: userData } = await supabase.from('usuarios').select('nombres, apellidos').eq('id', user.id).single();
                const nombreResidente = userData ? `${userData.nombres} ${userData.apellidos}` : 'Un residente';

                // Crear un array de notificaciones para insertar en lote
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

    /**
     * actualizarEstadoPrestamo
     * ─────────────────────────────────────────────────────────
     * Cambia el estado de un préstamo y ejecuta las acciones asociadas.
     *
     * Flujo según el nuevo estado:
     *  - 'entregado': Registra fecha de préstamo, resta stock del insumo.
     *  - 'devuelto': Registra fecha de devolución, retorna stock del insumo.
     *  - 'danado': Registra fecha de devolución y reporte de daño.
     *  - 'rechazado': Notifica al residente el rechazo con motivo.
     *  - 'cancelado': Retorna stock si estaba entregado.
     *
     * Lógica de inventario:
     *  - Solo se ajusta el stock si el estado anterior era diferente al nuevo.
     *  - Entregar: stock -= cantidad (solo si no estaba ya entregado).
     *  - Devolver/Cancelar: stock += cantidad (solo si estaba entregado).
     *
     * @param {string} id - UUID del préstamo a actualizar.
     * @param {string} nuevoEstado - Nuevo estado: 'entregado' | 'devuelto' | 'danado' | 'rechazado' | 'cancelado'.
     * @param {string} observaciones - Notas del administrador (opcional, requerido para rechazos).
     * @param {string|null} fecha - Fecha personalizada en formato ISO (opcional, usa fecha actual por defecto).
     * @returns {Promise<{success: boolean, error?: string}>} Resultado de la operación.
     */
    const actualizarEstadoPrestamo = async (id, nuevoEstado, observaciones = '', fecha = null) => {
        try {
            // Paso 1: Obtener el estado actual del préstamo antes de actualizar
            // Esto es crítico para decidir si se debe ajustar el inventario (stock)
            const { data: pActual } = await supabase
                .from('prestamos_insumos')
                .select('insumo_id, cantidad, estado')
                .eq('id', id)
                .single();

            // Construir objeto de actualización según el nuevo estado
            const updateData = { 
                estado: nuevoEstado, 
                updated_at: new Date() 
            };
            
            // Asignar campos de fecha y observaciones según el tipo de cambio
            if (nuevoEstado === 'entregado') {
                updateData.fecha_prestamo = fecha || new Date();
                updateData.observaciones_admin = observaciones;
            } else if (nuevoEstado === 'devuelto' || nuevoEstado === 'danado') {
                updateData.fecha_devolucion = fecha || new Date();
                updateData.observaciones_admin = observaciones;
            }

            // Ejecutar actualización del estado del préstamo
            const { error } = await supabase
                .from('prestamos_insumos')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Paso 2: Crear notificación para el residente sobre el cambio de estado
            // Consultar datos del préstamo con joins para construir el mensaje descriptivo
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

                // Determinar contenido de la notificación según el estado
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

                // Enviar notificación al residente propietario de la reserva
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

            // Paso 3: Ajustar inventario (stock del insumo) según el cambio de estado
            if (pActual) {
                // Consultar stock actual del insumo
                const { data: insumo } = await supabase.from('insumos').select('cantidad_disponible').eq('id', pActual.insumo_id).single();
                
                if (insumo) {
                    let nuevaCantidad = insumo.cantidad_disponible;

                    // Lógica de ajuste de inventario:
                    // ENTREGAR → Restar del stock (solo si antes NO estaba entregado)
                    if (nuevoEstado === 'entregado' && pActual.estado !== 'entregado') {
                        nuevaCantidad -= pActual.cantidad;
                    } 
                    // DEVOLVER o CANCELAR → Retornar al stock (solo si antes SÍ estaba entregado)
                    else if ((nuevoEstado === 'devuelto' || nuevoEstado === 'cancelado') && pActual.estado === 'entregado') {
                        nuevaCantidad += pActual.cantidad;
                    }

                    // Solo actualizar si la cantidad cambió
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

    /**
     * reportarDanio
     * ─────────────────────────────────────────────────────────
     * Marca un préstamo como dañado registrando las observaciones del residente.
     * Se usa cuando el residente reporta que un insumo fue deteriorado durante su uso.
     *
     * @param {string} id - UUID del préstamo dañado.
     * @param {string} observaciones - Descripción del daño reportado por el residente.
     * @returns {Promise<{success: boolean, error?: string}>} Resultado de la operación.
     */
    const reportarDanio = async (id, observaciones) => {
        try {
            // Actualizar estado a 'danado' con fecha de devolución y observaciones del residente
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

    // Retorna el estado y las funciones del hook para ser consumidos por los componentes
    return {
        prestamos,
        loading,
        fetchPrestamos,
        solicitarPrestamo,
        actualizarEstadoPrestamo,
        reportarDanio
    };
};
