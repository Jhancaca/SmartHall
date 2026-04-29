/**
 * useUsuarios.js
 * ─────────────────────────────────────────────────────────
 * Hook personalizado para la gestión de usuarios en SmartHall.
 * 
 * Contiene toda la lógica de negocio para:
 *  - Listar usuarios con sus perfiles respectivos.
 *  - Crear nuevos usuarios administrando Supabase Auth y la tabla de perfiles.
 *  - Actualizar datos de usuarios existentes (como el estado activo/inactivo).
 *  - Obtener la lista de perfiles disponibles (administrador, supervisor, residente).
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * fetchUsuarios
   * Consulta la lista completa de usuarios uniendo la tabla 'usuarios'
   * con 'perfiles' para mostrar el nombre del rol.
   */
  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          perfiles ( nombre )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * getPerfiles
   * Obtiene los perfiles configurados en la base de datos.
   */
  const getPerfiles = async () => {
    const { data, error } = await supabase.from('perfiles').select('*');
    if (error) throw error;
    return data;
  };

  /**
   * createUsuario
   * Registra un nuevo usuario en dos pasos:
   *  1. Lo crea en el sistema de autenticación de Supabase (Auth).
   *  2. Inserta la información adicional en la tabla 'usuarios'.
   * 
   * @param {object} nuevoUsuario - Objeto con datos del formulario.
   */
  const createUsuario = async (nuevoUsuario) => {
    try {
      // Paso 1: Registro en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
      });

      if (authError) throw authError;

      // Paso 2: Asociación en la tabla de perfiles de la DB pública
      if (authData.user) {
         const { error: dbError } = await supabase.from('usuarios').insert({
            id: authData.user.id,
            nombres: nuevoUsuario.nombres,
            apellidos: nuevoUsuario.apellidos,
            email: nuevoUsuario.email,
            perfil_id: nuevoUsuario.perfil_id,
            numero_apto: nuevoUsuario.numero_apto || null,
            telefono: nuevoUsuario.telefono || null,
            estado: nuevoUsuario.estado || 'activo'
         });
         if (dbError) throw dbError;
      }
      
      await fetchUsuarios(); // Refrescar lista
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  /**
   * updateUsuario
   * Actualiza los datos de un usuario en la tabla pública.
   */
  const updateUsuario = async (id, datos) => {
    try {
      const { error } = await supabase.from('usuarios').update(datos).eq('id', id);
      if (error) throw error;
      await fetchUsuarios();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  /**
   * deleteUsuario
   * Elimina físicamente un usuario (si RLS lo permite).
   */
  const deleteUsuario = async (id) => {
    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;
      await fetchUsuarios();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  /**
   * Suscripción Realtime para Usuarios
   */
  useEffect(() => {
    const channel = supabase
      .channel('public:usuarios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios' },
        (payload) => {
          fetchUsuarios();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsuarios]);

  return { usuarios, loading, error, fetchUsuarios, getPerfiles, createUsuario, updateUsuario, deleteUsuario };
};
