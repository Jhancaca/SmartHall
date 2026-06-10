/**
 * useAuditoria.js
 * ─────────────────────────────────────────────────────────
 * Hook personalizado para el sistema de auditoría y bitácora de SmartHall.
 *
 * Permite registrar y consultar eventos de seguridad realizados por los usuarios:
 *  - Creaciones, ediciones, eliminaciones y consultas de datos.
 *  - Filtrado por tipo de entidad (reservas, insumos, usuarios, etc.).
 *  - Filtrado por tipo de acción (CREAR, EDITAR, ELIMINAR, CONSULTAR).
 *  - Filtrado por usuario específico.
 *
 * Tablas de Supabase involucradas:
 *  - auditoria: Registro de eventos de seguridad del sistema.
 *    Columnas: id, usuario_id, accion, entidad, entidad_id, detalles, ip_address, created_at.
 *  - usuarios: Join para obtener datos del usuario que realizó la acción.
 *
 * Uso principal:
 *  - Dashboard.jsx: Muestra los últimos 5 eventos de auditoría en la bitácora.
 *  - Auditoria.jsx: Página completa con filtros avanzados y tabla de logs.
 *  - Otros hooks: Llaman a registrarLog() después de cada operación CRUD.
 *
 * @module hooks/useAuditoria
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook de auditoría para registro y consulta de eventos de seguridad.
 * @returns {Object} Estado y funciones del sistema de auditoría.
 * @property {Array} logs - Lista de registros de auditoría cargados.
 * @property {boolean} loading - Estado de carga de la consulta.
 * @property {Function} fetchLogs - Consulta logs con filtros opcionales.
 * @property {Function} registrarLog - Registra un nuevo evento de auditoría.
 */
export const useAuditoria = () => {
  // Usuario actual autenticado (se usa para vincular los logs al usuario)
  const { user } = useAuth();
  // Lista de registros de auditoría cargados
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * fetchLogs
   * ─────────────────────────────────────────────────────────
   * Consulta la tabla 'auditoria' con joins a 'usuarios' para obtener
   * el nombre y apellido del usuario que realizó la acción.
   *
   * Soporta filtros opcionales para refinar la búsqueda:
   *  - entidad: Filtra por tabla afectada (ej: 'reservas', 'insumos', 'usuarios').
   *  - accion: Filtra por tipo de operación (ej: 'CREAR', 'EDITAR', 'ELIMINAR').
   *  - usuario_id: Filtra por el UUID del usuario que realizó la acción.
   *
   * Limita la consulta a 100 registros para mantener rendimiento.
   *
   * @param {Object} filtros - Objeto con filtros opcionales.
   * @param {string} [filtros.entidad] - Nombre de la entidad/tabla a filtrar.
   * @param {string} [filtros.accion] - Tipo de acción a filtrar.
   * @param {string} [filtros.usuario_id] - UUID del usuario a filtrar.
   * @returns {Promise<void>} Actualiza el estado interno 'logs'.
   */
  const fetchLogs = async (filtros = {}) => {
    setLoading(true);
    // Construir query base con join a tabla usuarios
    let query = supabase
      .from('auditoria')
      .select(`
        *,
        usuarios ( nombres, apellidos, email )
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros dinámicamente si se proporcionan
    if (filtros.entidad) query = query.eq('entidad', filtros.entidad);
    if (filtros.accion) query = query.eq('accion', filtros.accion);
    if (filtros.usuario_id) query = query.eq('usuario_id', filtros.usuario_id);

    // Limitar a 100 registros para rendimiento
    const { data, error } = await query.limit(100);
    
    if (error) {
      console.error('Error fetching logs:', error.message);
    } else {
      setLogs(data);
    }
    setLoading(false);
  };

  /**
   * registrarLog
   * ─────────────────────────────────────────────────────────
   * Registra un nuevo evento de auditoría en la tabla 'auditoria'.
   *
   * Se llama desde otros hooks y componentes después de cada operación CRUD:
   *  - useReservas: Al crear, aprobar, rechazar o cancelar reservas.
   *  - useInventario: Al crear, editar o eliminar insumos.
   *  - usePrestamos: Al cambiar estados de préstamos.
   *  - Páginas: Al realizar acciones significativas del negocio.
   *
   * @param {Object} params - Datos del evento a registrar.
   * @param {string} params.accion - Tipo de acción: 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'CONSULTAR'.
   * @param {string} params.entidad - Nombre de la tabla/entidad afectada (ej: 'reservas', 'insumos').
   * @param {string} params.entidad_id - UUID del registro afectado.
   * @param {string} params.detalles - Descripción legible de lo que ocurrió.
   * @returns {Promise<void>} Inserta el registro en la base de datos.
   */
  const registrarLog = async ({ accion, entidad, entidad_id, detalles }) => {
    if (!user) return;

    // Insertar registro de auditoría vinculado al usuario actual
    const { error } = await supabase.from('auditoria').insert([{
      usuario_id: user.id,
      accion,
      entidad,
      entidad_id,
      detalles,
      ip_address: null // La IP se podría capturar en el cliente o vía Supabase Edge Function
    }]);

    if (error) console.error('Error al registrar log:', error.message);
  };

  return {
    logs,
    loading,
    fetchLogs,
    registrarLog
  };
};
