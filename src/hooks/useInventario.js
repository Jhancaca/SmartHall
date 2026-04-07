/**
 * useInventario.js
 * ─────────────────────────────────────────────────────────
 * Hook personalizado para la gestión de insumos en SmartHall.
 * 
 * Centraliza la interacción con las tablas 'insumos' y 'categorias_insumo':
 *  - Carga el listado de insumos con sus categorías vinculadas.
 *  - Gestiona la carga de categorías para formularios.
 *  - Realiza las operaciones CRUD (Crear, Actualizar, Borrar).
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useInventario = () => {
  const [insumos, setInsumos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * fetchInsumos
   * Obtiene todos los insumos ordenados alfabéticamente por nombre,
   * incluyendo la información de su categoría.
   */
  const fetchInsumos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select(`
          *,
          categorias_insumo ( id, nombre, icono )
        `)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setInsumos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * fetchCategorias
   * Carga las categorías de insumos disponibles (Mobiliario, Menaje, etc.)
   */
  const fetchCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('categorias_insumo').select('*');
      if (error) throw error;
      setCategorias(data);
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  }, []);

  /**
   * createInsumo
   * Inserta un nuevo registro en la tabla 'insumos'.
   */
  const createInsumo = async (datos) => {
    try {
      const { error } = await supabase.from('insumos').insert(datos);
      if (error) throw error;
      await fetchInsumos();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  /**
   * updateInsumo
   * Actualiza un insumo existente filtrando por su UUID.
   */
  const updateInsumo = async (id, datos) => {
    try {
      const { error } = await supabase.from('insumos').update(datos).eq('id', id);
      if (error) throw error;
      await fetchInsumos();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  /**
   * deleteInsumo
   * Elimina un insumo de la base de datos.
   */
  const deleteInsumo = async (id) => {
    try {
      const { error } = await supabase.from('insumos').delete().eq('id', id);
      if (error) throw error;
      await fetchInsumos();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return { 
    insumos, categorias, loading, error, 
    fetchInsumos, fetchCategorias, 
    createInsumo, updateInsumo, deleteInsumo 
  };
};
