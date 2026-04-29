import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useConfiguraciones = () => {
  const [opciones, setOpciones] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOpciones = async (categoria = null) => {
    setLoading(true);
    let query = supabase.from('configuraciones_sistema').select('*').eq('activo', true).order('orden', { ascending: true });
    
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

  const getOpcionesPorCategoria = (categoria) => {
    return opciones.filter(o => o.categoria === categoria);
  };

  const crearOpcion = async (nuevaOpcion) => {
    const { data, error } = await supabase.from('configuraciones_sistema').insert([nuevaOpcion]).select();
    if (!error) {
      setOpciones([...opciones, ...data]);
      return { success: true, data: data[0] };
    }
    return { success: false, error: error.message };
  };

  const actualizarOpcion = async (id, cambios) => {
    const { data, error } = await supabase.from('configuraciones_sistema').update(cambios).eq('id', id).select();
    if (!error) {
      setOpciones(opciones.map(o => o.id === id ? data[0] : o));
      return { success: true };
    }
    return { success: false, error: error.message };
  };

  const eliminarOpcion = async (id) => {
    const { error } = await supabase.from('configuraciones_sistema').delete().eq('id', id);
    if (!error) {
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
