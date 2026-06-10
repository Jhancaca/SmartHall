/**
 * useConfiguraciones.js
 * ─────────────────────────────────────────────────────────
 * Hook personalizado para la gestión de configuraciones del sistema SmartHall.
 *
 * Administra la tabla 'configuraciones_sistema' que almacena pares clave-valor
 * organizados por categorías. Permite configurar parámetros del sistema como:
 *  - Tipos de eventos permitidos (Cumpleaños, Fiesta, Asamblea, etc.)
 *  - Restricciones de reserva (anticipación mínima, capacidad máxima del salón).
 *  - Reglas de inventario (stock mínimo, categorías activas).
 *  - Cualquier parámetro configurable desde la interfaz de administración.
 *
 * Tablas de Supabase involucradas:
 *  - configuraciones_sistema: Almacena las configuraciones del sistema.
 *    Columnas: id, clave, valor, categoria, activo, orden, created_at.
 *
 * Página consumidora principal:
 *  - Configuracion.jsx: Interfaz de administración para gestionar las opciones.
 *
 * @module hooks/useConfiguraciones
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook de gestión de configuraciones del sistema.
 * @returns {Object} Estado y funciones para manipular configuraciones.
 * @property {Array} opciones - Lista de configuraciones cargadas.
 * @property {boolean} loading - Estado de carga de la consulta.
 * @property {Function} fetchOpciones - Carga configuraciones (opcionalmente filtradas por categoría).
 * @property {Function} getOpcionesPorCategoria - Filtra opciones por categoría (client-side).
 * @property {Function} crearOpcion - Inserta una nueva configuración.
 * @property {Function} actualizarOpcion - Modifica una configuración existente.
 * @property {Function} eliminarOpcion - Elimina una configuración.
 */
export const useConfiguraciones = () => {
  // Lista de configuraciones del sistema
  const [opciones, setOpciones] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * fetchOpciones
   * ─────────────────────────────────────────────────────────
   * Consulta la tabla 'configuraciones_sistema' filtrando solo registros activos.
   * Ordena por el campo 'orden' ascendente para mantener el orden visual.
   *
   * @param {string|null} categoria - Categoría a filtrar. Si es null, carga todas las configuraciones.
   * @returns {Promise<void>} Actualiza el estado interno 'opciones'.
   */
  const fetchOpciones = async (categoria = null) => {
    setLoading(true);
    let query = supabase.from('configuraciones_sistema').select('*').eq('activo', true).order('orden', { ascending: true });
    
    // Aplicar filtro de categoría dinámicamente
    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching opciones:', error.message);
    } else {
      setOpciones(data);
    }
    setLoading(false);
  };

  /**
   * getOpcionesPorCategoria
   * ─────────────────────────────────────────────────────────
   * Filtra las opciones ya cargadas en memoria por categoría (operación client-side).
   * Útil cuando ya se tienen todas las configuraciones y se necesita un subconjunto.
   *
   * @param {string} categoria - Nombre de la categoría a filtrar.
   * @returns {Array} Array de opciones que coinciden con la categoría.
   */
  const getOpcionesPorCategoria = (categoria) => {
    return opciones.filter(o => o.categoria === categoria);
  };

  /**
   * crearOpcion
   * ─────────────────────────────────────────────────────────
   * Inserta una nueva configuración en la tabla 'configuraciones_sistema'.
   * Actualiza el estado local con la nueva opción sin re-fetch completo.
   *
   * @param {Object} nuevaOpcion - Datos de la configuración a crear.
   * @param {string} nuevaOpcion.clave - Identificador único de la configuración.
   * @param {string} nuevoOpcion.valor - Valor de la configuración.
   * @param {string} nuevaOpcion.categoria - Categoría a la que pertenece.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>} Resultado de la operación.
   */
  const crearOpcion = async (nuevaOpcion) => {
    const { data, error } = await supabase.from('configuraciones_sistema').insert([nuevaOpcion]).select();
    if (!error) {
      // Agregar la nueva opción al estado local
      setOpciones([...opciones, ...data]);
      return { success: true, data: data[0] };
    }
    return { success: false, error: error.message };
  };

  /**
   * actualizarOpcion
   * ─────────────────────────────────────────────────────────
   * Actualiza una configuración existente filtrando por su UUID.
   * Sincroniza el estado local con la actualización.
   *
   * @param {string} id - UUID de la configuración a actualizar.
   * @param {Object} cambios - Campos a modificar (ej: { valor: 'nuevo_valor' }).
   * @returns {Promise<{success: boolean, error?: string}>} Resultado de la operación.
   */
  const actualizarOpcion = async (id, cambios) => {
    const { data, error } = await supabase.from('configuraciones_sistema').update(cambios).eq('id', id).select();
    if (!error) {
      // Reemplazar la opción modificada en el estado local
      setOpciones(opciones.map(o => o.id === id ? data[0] : o));
      return { success: true };
    }
    return { success: false, error: error.message };
  };

  /**
   * eliminarOpcion
   * ─────────────────────────────────────────────────────────
   * Elimina una configuración de la base de datos y del estado local.
   *
   * @param {string} id - UUID de la configuración a eliminar.
   * @returns {Promise<{success: boolean, error?: string}>} Resultado de la operación.
   */
  const eliminarOpcion = async (id) => {
    const { error } = await supabase.from('configuraciones_sistema').delete().eq('id', id);
    if (!error) {
      // Filtrar la opción eliminada del estado local
      setOpciones(opciones.filter(o => o.id !== id));
      return { success: true };
    }
    return { success: false, error: error.message };
  };

  return {
    opciones,
    loading,
    fetchOpciones,
    getOpcionesPorCategoria,
    crearOpcion,
    actualizarOpcion,
    eliminarOpcion
  };
};
