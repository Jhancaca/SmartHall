/**
 * useInvitados.js
 * ─────────────────────────────────────────────────────────
 * Hook personalizado utilizando TanStack React Query para la gestión
 * de la lista de invitados y control de acceso (Check-in).
 * 
 * Centraliza la comunicación con la tabla 'invitados_reserva' en Supabase,
 * garantizando caching óptimo, re-fetch inteligente e invalidación de
 * consultas para una sincronización en tiempo real impecable.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Hook de gestión de invitados.
 */
export const useInvitados = (reservaId = null) => {
  const queryClient = useQueryClient();

  /**
   * Query: Obtiene la lista de invitados para una reserva específica.
   */
  const {
    data: invitados = [],
    isLoading: cargandoInvitados,
    error: errorInvitados,
    refetch: recargarInvitados,
  } = useQuery({
    queryKey: ['invitados', reservaId],
    queryFn: async () => {
      if (!reservaId) return [];
      const { data, error } = await supabase
        .from('invitados_reserva')
        .select('*')
        .eq('reserva_id', reservaId)
        .order('nombre_completo', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!reservaId,
  });

  /**
   * Query: Obtiene TODOS los invitados programados para hoy
   * (Utilizado por el panel de Control de Acceso en Portería).
   */
  const obtenerInvitadosDeHoy = () => {
    return useQuery({
      queryKey: ['invitados', 'hoy'],
      queryFn: async () => {
        const hoy = new Date().toISOString().split('T')[0];
        
        // Obtener reservas de hoy que estén aprobadas
        const { data: reservasHoy, error: errorReservas } = await supabase
          .from('reservas')
          .select(`
            id,
            tipo_evento,
            fecha_evento,
            usuarios:residente_id (
              nombres,
              apellidos,
              numero_apto
            )
          `)
          .eq('fecha_evento', hoy)
          .eq('estado', 'aprobada');

        if (errorReservas) throw new Error(errorReservas.message);
        if (!reservasHoy || reservasHoy.length === 0) return [];

        const reservaIds = reservasHoy.map(r => r.id);

        // Obtener invitados para estas reservas
        const { data: invitadosHoy, error: errorInvitados } = await supabase
          .from('invitados_reserva')
          .select('*')
          .in('reserva_id', reservaIds)
          .order('nombre_completo', { ascending: true });

        if (errorInvitados) throw new Error(errorInvitados.message);

        // Mapear cada invitado con los datos de su reserva asociada
        return (invitadosHoy || []).map(inv => {
          const res = reservasHoy.find(r => r.id === inv.reserva_id);
          return {
            ...inv,
            reserva: res
          };
        });
      },
      refetchInterval: 15000, // Auto-refetch cada 15 segundos para sincronizar ingresos en portería
    });
  };

  /**
   * Mutation: Registrar un nuevo invitado en la lista de la reserva.
   */
  const agregarInvitadoMutation = useMutation({
    mutationFn: async ({ nombreCompleto, documentoIdentidad }) => {
      if (!reservaId) throw new Error('Se requiere un ID de reserva.');
      const { data, error } = await supabase
        .from('invitados_reserva')
        .insert({
          reserva_id: reservaId,
          nombre_completo: nombreCompleto,
          documento_identidad: documentoIdentidad,
          estado_acceso: 'pendiente'
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      // Invalidar caché de invitados de la reserva y de hoy para recargar datos
      queryClient.invalidateQueries({ queryKey: ['invitados', reservaId] });
      queryClient.invalidateQueries({ queryKey: ['invitados', 'hoy'] });
    }
  });

  /**
   * Mutation: Eliminar un invitado de la lista.
   */
  const eliminarInvitadoMutation = useMutation({
    mutationFn: async (invitadoId) => {
      const { error } = await supabase
        .from('invitados_reserva')
        .delete()
        .eq('id', invitadoId);

      if (error) throw new Error(error.message);
      return invitadoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitados', reservaId] });
      queryClient.invalidateQueries({ queryKey: ['invitados', 'hoy'] });
    }
  });

  /**
   * Mutation: Registrar Check-in (ingreso) de un invitado.
   */
  const registrarCheckInMutation = useMutation({
    mutationFn: async ({ invitadoId, estado }) => {
      const datosActualizacion = {
        estado_acceso: estado,
        ingresado_a_las: estado === 'ingresado' ? new Date().toISOString() : null
      };

      const { data, error } = await supabase
        .from('invitados_reserva')
        .update(datosActualizacion)
        .eq('id', invitadoId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitados', data.reserva_id] });
      queryClient.invalidateQueries({ queryKey: ['invitados', 'hoy'] });
    }
  });

  return {
    invitados,
    cargandoInvitados,
    errorInvitados,
    recargarInvitados,
    obtenerInvitadosDeHoy,
    agregarInvitado: agregarInvitadoMutation.mutateAsync,
    agregando: agregarInvitadoMutation.isPending,
    eliminarInvitado: eliminarInvitadoMutation.mutateAsync,
    eliminando: eliminarInvitadoMutation.isPending,
    registrarCheckIn: registrarCheckInMutation.mutateAsync,
    registrando: registrarCheckInMutation.isPending,
  };
};
