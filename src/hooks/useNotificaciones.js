/**
 * useNotificaciones.js
 * ─────────────────────────────────────────────────────────
 * Hook para gestionar las notificaciones del usuario.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useNotificaciones = () => {
    const { user } = useAuth();
    const [notificaciones, setNotificaciones] = useState([]);
    const [sinLeer, setSinLeer] = useState(0);
    const [loading, setLoading] = useState(false);

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
            setSinLeer(data.filter(n => !n.leida).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const marcarComoLeida = async (id) => {
        try {
            const { error } = await supabase
                .from('notificaciones')
                .update({ leida: true })
                .eq('id', id);
            
            if (error) throw error;
            fetchNotificaciones();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

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
        fetchNotificaciones();

        // Realtime
        const channel = supabase
            .channel('notificaciones_user')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notificaciones',
                filter: `usuario_id=eq.${user?.id}`
            }, () => {
                fetchNotificaciones();
            })
            .subscribe();

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
