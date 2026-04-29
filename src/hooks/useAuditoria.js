import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useAuditoria = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (filtros = {}) => {
    setLoading(true);
    let query = supabase
      .from('auditoria')
      .select(`
        *,
        usuarios ( nombres, apellidos, email )
      `)
      .order('created_at', { ascending: false });

    if (filtros.entidad) query = query.eq('entidad', filtros.entidad);
    if (filtros.accion) query = query.eq('accion', filtros.accion);
    if (filtros.usuario_id) query = query.eq('usuario_id', filtros.usuario_id);

    const { data, error } = await query.limit(100);
    
    if (error) {
      console.error('Error fetching logs:', error.message);
    } else {
      setLogs(data);
    }
    setLoading(false);
  };

  const registrarLog = async ({ accion, entidad, entidad_id, detalles }) => {
    if (!user) return;

    const { error } = await supabase.from('auditoria').insert([{
      usuario_id: user.id,
      accion,
      entidad,
      entidad_id,
      detalles,
      ip_address: null // Se podría capturar en el cliente o vía edge function
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
