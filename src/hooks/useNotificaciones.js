/**
 * useNotificaciones.js
 * ─────────────────────────────────────────────────────────
 * Hook principal para gestionar las notificaciones del usuario actual en SmartHall.
 *
 * Diferencia con useNotifications.js:
 *  - Este hook (useNotificaciones) recarga la lista completa al recibir una nueva
 *    notificación (re-fetch completo). Más simple pero menos óptimo.
 *  - useNotifications.js realiza inserción incremental (más eficiente).
 *
 * Este hook es el utilizado por el componente NotificationCenter.jsx.
 *
 * Funcionalidades:
 *  - Carga las últimas 20 notificaciones del usuario autenticado.
 *  - Marcado individual y masivo como leídas.
 *  - Suscripción Realtime para recibir notificaciones push en tiempo real.
 *  - Contador de notificaciones no leídas (badge del Header).
 *
 * Tablas de Supabase involucradas:
 *  - notificaciones: Almacena las alertas del sistema.
 *    Columnas: id, usuario_id, titulo, mensaje, tipo, leida, vinculo, creado_en.
 *
 * @module hooks/useNotificaciones
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook de notificaciones con re-fetch completo.
 * @returns {Object} Estado y funciones del sistema de notificaciones.
 * @property {Array} notificaciones - Lista de las últimas 20 notificaciones.
 * @property {number} sinLeer - Contador de notificaciones no leídas.
 * @property {boolean} loading - Estado de carga de la consulta.
 * @property {Function} marcarComoLeida - Marca una notificación como leída y recarga la lista.
 * @property {Function} marcarTodasComoLeidas - Marca todas como leídas y recarga la lista.
 * @property {Function} fetchNotificaciones - Recarga la lista de notificaciones desde la BD.
 */
export const useNotificaciones = () => {
    // Usuario actual autenticado (se usa para filtrar notificaciones)
    const { user } = useAuth();
    // Lista de notificaciones del usuario (últimas 20)
    const [notificaciones, setNotificaciones] = useState([]);
    // Contador de notificaciones no leídas (para badge visual en Header)
    const [sinLeer, setSinLeer] = useState(0);
    const [loading, setLoading] = useState(false);

    /**
     * fetchNotificaciones
     * Carga las últimas 20 notificaciones del usuario actual.
     * Ordena por fecha de creación descendente (más recientes primero).
     * Calcula el contador de no leídas para el badge del Header.
     *
     * @returns {Promise<void>} Actualiza los estados notificaciones y sinLeer.
     */
    const fetchNotificaciones = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notificaciones')
                .select('*')
                .eq('usuario_id', user.id)
                .order('creado_en', { ascending: false })
                .limit(20);

            if (error) throw error;
            setNotificaciones(data);
            // Filtrar notificaciones con campo 'leida' en false
            setSinLeer(data.filter(n => !n.leida).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * marcarComoLeida
     * Marca una notificación individual como leída en la BD y recarga la lista.
     *
     * @param {string} id - UUID de la notificación a marcar como leída.
     * @returns {Promise<void>} Actualiza el estado local tras recargar la lista.
     */
    const marcarComoLeida = async (id) => {
        try {
            const { error } = await supabase
                .from('notificaciones')
                .update({ leida: true })
                .eq('id', id);
            
            if (error) throw error;
            // Recargar la lista completa para sincronizar el contador
            fetchNotificaciones();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    /**
     * marcarTodasComoLeidas
     * Marca todas las notificaciones del usuario como leídas en la BD.
     * Actualiza todas las notificaciones con leida=false en una sola operación.
     *
     * @returns {Promise<void>} Actualiza el estado local tras recargar la lista.
     */
    const marcarTodasComoLeidas = async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('notificaciones')
                .update({ leida: true })
                .eq('usuario_id', user.id);
            
            if (error) throw error;
            fetchNotificaciones();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    useEffect(() => {
        // Carga inicial de notificaciones existentes al montar el componente
        fetchNotificaciones();

        // Suscripción Realtime a la tabla 'notificaciones' filtrada por usuario actual
        // Solo escucha eventos INSERT (nuevas notificaciones)
        const channel = supabase
            .channel('notificaciones_user')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notificaciones',
                filter: `usuario_id=eq.${user?.id}`
            }, () => {
                // Al recibir una nueva notificación, recarga la lista completa
                fetchNotificaciones();
            })
            .subscribe();

        // Limpiar suscripción al desmontar o cambiar de usuario
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotificaciones]);

    return { 
        notificaciones, 
        sinLeer, 
        loading, 
        marcarComoLeida, 
        marcarTodasComoLeidas, 
        fetchNotificaciones 
    };
};
