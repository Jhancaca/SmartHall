/**
 * useNotifications.js
 * ─────────────────────────────────────────────────────────
 * Hook alternativo para el sistema de notificaciones en tiempo real.
 *
 * A diferencia de useNotificaciones.js (que recarga la lista completa al recibir
 * una notificación), este hook optimiza el rendimiento insertando la nueva notificación
 * directamente en el estado local sin re-fetch completo.
 *
 * Características:
 *  - Suscripción Realtime filtrada por usuario_id para recibir solo notificaciones propias.
 *  - Notificación nativa del navegador (Web Notifications API) al recibir nuevas alertas.
 *  - Operaciones de marcado como leídas (individual y masiva).
 *  - Creación de notificaciones programáticas (para usar desde otros hooks).
 *
 * Tablas de Supabase involucradas:
 *  - notificaciones: Almacena las alertas del sistema.
 *    Columnas: id, usuario_id, titulo, mensaje, tipo, leida, vinculo, creado_en.
 *
 * @module hooks/useNotifications
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook de notificaciones en tiempo real con optimización de inserción incremental.
 * @returns {Object} Estado y funciones del sistema de notificaciones.
 * @property {Array} notifications - Lista de las últimas 20 notificaciones del usuario.
 * @property {number} unreadCount - Contador de notificaciones no leídas.
 * @property {boolean} loading - Estado de carga inicial.
 * @property {Function} markAsRead - Marca una notificación como leída.
 * @property {Function} markAllAsRead - Marca todas las notificaciones como leídas.
 * @property {Function} createNotification - Crea una notificación programáticamente.
 * @property {Function} fetchNotifications - Recarga la lista de notificaciones desde la BD.
 */
export const useNotifications = () => {
  const { user } = useAuth();
  // Lista de notificaciones del usuario actual (últimas 20)
  const [notifications, setNotifications] = useState([]);
  // Contador de notificaciones no leídas (para badge del Header)
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No ejecutar si no hay usuario autenticado
    if (!user) return;

    // Carga inicial de notificaciones existentes
    fetchNotifications();

    // Suscripción Realtime a la tabla 'notificaciones' filtrada por usuario actual
    // Evento: INSERT - solo escucha nuevas notificaciones (no updates)
    const channel = supabase
      .channel('public:notificaciones')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          // Inserción incremental: agrega la nueva notificación al inicio del array
          // Sin necesidad de re-fetch completo (optimización de rendimiento)
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
          
          // Notificación nativa del navegador (solo si el usuario otorgó permiso)
          if (Notification.permission === 'granted') {
            new Notification(payload.new.titulo, { body: payload.new.mensaje });
          }
        }
      )
      .subscribe();

    // Limpiar suscripción al desmontar el componente o cambiar de usuario
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /**
   * fetchNotifications
   * Carga las últimas 20 notificaciones del usuario desde Supabase.
   * Ordena por fecha de creación descendente (más recientes primero).
   * Calcula el contador de no leídas.
   */
  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error.message);
    } else {
      setNotifications(data);
      // Filtrar notificaciones con campo 'leida' en false para el badge
      setUnreadCount(data.filter((n) => !n.leida).length);
    }
    setLoading(false);
  };

  /**
   * markAsRead
   * Marca una notificación individual como leída.
   * Actualiza optimistamente el estado local sin re-fetch.
   *
   * @param {string} id - UUID de la notificación a marcar como leída.
   */
  const markAsRead = async (id) => {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id);

    if (!error) {
      // Actualización optimista del estado local
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  /**
   * markAllAsRead
   * Marca todas las notificaciones no leídas del usuario como leídas.
   * Opera directamente en la BD y sincroniza el estado local.
   */
  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', user.id)
      .eq('leida', false);

    if (!error) {
      // Actualizar todas las notificaciones del estado local como leídas
      setNotifications(notifications.map((n) => ({ ...n, leida: true })));
      setUnreadCount(0);
    }
  };

  /**
   * createNotification
   * Crea una nueva notificación programáticamente.
   * Útil para que otros hooks o componentes generen notificaciones.
   *
   * @param {Object} notif - Objeto con los campos de la notificación.
   * @param {string} notif.usuario_id - UUID del usuario destinatario.
   * @param {string} notif.titulo - Título corto de la notificación.
   * @param {string} notif.mensaje - Cuerpo del mensaje de la notificación.
   * @param {string} notif.tipo - Tipo visual: 'info' | 'success' | 'warning' | 'error'.
   * @param {string} [notif.vinculo] - Ruta de navegación al hacer clic (opcional).
   * @returns {Promise<{success: boolean, error?: object}>} Resultado de la inserción.
   */
  const createNotification = async (notif) => {
    const { data, error } = await supabase.from('notificaciones').insert([notif]);
    return { success: !error, error };
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    fetchNotifications,
  };
};
