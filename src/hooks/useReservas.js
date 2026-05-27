/**
 * useReservas.js
 * ─────────────────────────────────────────────────────────
 * Hook personalizado optimizado con TanStack React Query para la gestión
 * de reservas en SmartHall.
 * 
 * Centraliza la interacción con la tabla 'reservas' en Supabase:
 *  - Carga el listado de reservas con caching inteligente.
 *  - Crea, aprueba, rechaza y cancela reservas invalidando las queries correspondientes.
 *  - Mantiene compatibilidad total con la API e interfaces existentes.
 */

import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useReservas = (residenteId = null, filtroEstado = null) => {
  const queryClient = useQueryClient();

  /**
   * Query: Obtiene todas las reservas de la base de datos (con caché y filtrado)
   */
  const {
    data: reservas = [],
    isLoading: loading,
    error: errorQuery,
    refetch
  } = useQuery({
    queryKey: ['reservas', residenteId, filtroEstado],
    queryFn: async () => {
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

      if (residenteId) {
        query = query.eq('residente_id', residenteId);
      }
      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // Los datos se consideran válidos por 2 minutos
  });

  const error = errorQuery ? errorQuery.message : null;

  /**
   * fetchReservas
   * Mantiene la compatibilidad con el código anterior. Llama a refetch de React Query.
   */
  const fetchReservas = useCallback(async (rId = residenteId, fEst = filtroEstado, desde = null, hasta = null) => {
    // Si se pasan filtros en el llamado directo, los aplicamos invalidando la query
    if (rId !== residenteId || fEst !== filtroEstado) {
      await queryClient.invalidateQueries({ queryKey: ['reservas'] });
    }
    const result = await refetch();
    return { success: !result.error, data: result.data || [] };
  }, [refetch, queryClient, residenteId, filtroEstado]);

  /**
   * Suscripción Realtime para Reservas (Sincronización instantánea de caché)
   */
  useEffect(() => {
    const channel = supabase
      .channel('public:reservas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        () => {
          // Invalidar caché automáticamente ante cualquier cambio externo en tiempo real
          queryClient.invalidateQueries({ queryKey: ['reservas'] });
          queryClient.invalidateQueries({ queryKey: ['reservas-kpis'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  /**
   * verificarDisponibilidad
   * Llama a la función RPC de Supabase para validar disponibilidad.
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
   * Mutación: Crear Reserva
   */
  const crearReservaMutation = useMutation({
    mutationFn: async (datosReserva) => {
      // Validar primero disponibilidad
      const validacion = await verificarDisponibilidad(datosReserva.fecha_evento, null);
      if (!validacion.disponible) {
        throw new Error(validacion.mensaje);
      }

      const { data, error: err } = await supabase
        .from('reservas')
        .insert({ ...datosReserva, estado: 'pendiente' })
        .select()
        .single();

      if (err) throw err;

      // Enviar notificaciones a admin/supervisores
      const { data: todosLosUsuarios } = await supabase
        .from('usuarios')
        .select('id, perfiles(nombre)');

      const usersNotif = todosLosUsuarios?.filter(u => {
        const p = Array.isArray(u.perfiles) ? u.perfiles[0] : u.perfiles;
        return p?.nombre === 'administrador' || p?.nombre === 'supervisor';
      });

      if (usersNotif && usersNotif.length > 0) {
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

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-kpis'] });
    }
  });

  /**
   * Mutación: Aprobar Reserva
   */
  const aprobarReservaMutation = useMutation({
    mutationFn: async ({ reservaId, revisorId }) => {
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
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-kpis'] });
    }
  });

  /**
   * Mutación: Rechazar Reserva
   */
  const rechazarReservaMutation = useMutation({
    mutationFn: async ({ reservaId, revisorId, motivo }) => {
      if (!motivo || motivo.trim() === '') {
        throw new Error('El motivo de rechazo es obligatorio.');
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
        await supabase.from('notificaciones').insert([{
          usuario_id: res.residente_id,
          titulo: 'Reserva Rechazada',
          mensaje: `Lo sentimos, tu reserva para el ${res.fecha_evento} ha sido rechazada. Motivo: ${motivo}`,
          tipo: 'error',
          metadata: { reserva_id: res.id }
        }]);
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-kpis'] });
    }
  });

  /**
   * Mutación: Cancelar Reserva
   */
  const cancelarReservaMutation = useMutation({
    mutationFn: async ({ reservaId, motivo }) => {
      const { data, error: err } = await supabase
        .from('reservas')
        .update({
          estado: 'cancelada',
          motivo_rechazo: motivo || 'Cancelada por el residente'
        })
        .eq('id', reservaId)
        .select();

      if (err) throw err;
      const res = data?.[0];

      if (res) {
        // Notificar al residente
        await supabase.from('notificaciones').insert([{
          usuario_id: res.residente_id,
          titulo: 'Reserva Cancelada',
          mensaje: `Tu reserva para el ${res.fecha_evento} ha sido cancelada.`,
          tipo: 'warning',
          vinculo: '/reservas'
        }]);

        // Retornar stock de insumos prestados
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

        // Notificar a administradores
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
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-kpis'] });
    }
  });

  /**
   * obtenerReservasAprobadas (calendario)
   */
  const obtenerReservasAprobadas = useCallback(async (mesActual) => {
    const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).toISOString().split('T')[0];

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
      .gte('fecha_evento', primerDia)
      .lte('fecha_evento', ultimoDia)
      .order('fecha_evento', { ascending: true });

    if (err) throw err;
    return data || [];
  }, []);

  /**
   * obtenerReservasPendientes (KPI)
   */
  const obtenerReservasPendientes = useCallback(async () => {
    const { count, error: err } = await supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');

    if (err) throw err;
    return count || 0;
  }, []);

  /**
   * obtenerReservasEsteMes (KPI)
   */
  const obtenerReservasEsteMes = useCallback(async () => {
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
  }, []);

  /**
   * obtenerEstadisticasMensuales (Dashboard)
   */
  const obtenerEstadisticasMensuales = useCallback(async () => {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data, error: err } = await supabase
      .from('reservas')
      .select('estado')
      .gte('fecha_evento', primerDia)
      .lte('fecha_evento', ultimoDia);

    if (err) throw err;

    return {
      aprobadas: data.filter(r => r.estado === 'aprobada').length,
      rechazadas: data.filter(r => r.estado === 'rechazada').length,
      pendientes: data.filter(r => r.estado === 'pendiente').length,
      canceladas: data.filter(r => r.estado === 'cancelada').length,
    };
  }, []);

  return {
    reservas,
    loading,
    error,
    fetchReservas,
    verificarDisponibilidad,
    createReserva: async (datos) => {
      try {
        const data = await crearReservaMutation.mutateAsync(datos);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    aprobarReserva: async (reservaId, revisorId) => {
      try {
        const data = await aprobarReservaMutation.mutateAsync({ reservaId, revisorId });
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    rechazarReserva: async (reservaId, revisorId, motivo) => {
      try {
        const data = await rechazarReservaMutation.mutateAsync({ reservaId, revisorId, motivo });
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    cancelarReserva: async (reservaId, motivo = null) => {
      try {
        const data = await cancelarReservaMutation.mutateAsync({ reservaId, motivo });
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    obtenerReservasAprobadas,
    obtenerReservasPendientes,
    obtenerReservasEsteMes,
    obtenerEstadisticasMensuales,
    deleteReserva: async (id) => {
      // Eliminar registro de la base de datos realmente
      const { error: err } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id);
      if (!err) {
        queryClient.invalidateQueries({ queryKey: ['reservas'] });
        queryClient.invalidateQueries({ queryKey: ['reservas-kpis'] });
        return { success: true };
      }
      return { success: false, error: err.message };
    }
  };
};
