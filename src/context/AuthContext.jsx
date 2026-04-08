/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────
 * Contexto de Autenticación de la Aplicación.
 * 
 * Este archivo centraliza la lógica de sesión de Supabase:
 *  - Mantiene el estado del usuario autenticado (`user`).
 *  - Mantiene el perfil extendido del usuario (`profile`), incluyendo su rol.
 *  - Provee funciones para iniciar sesión (`signIn`) y cerrarla (`signOut`).
 *  - Gestiona el estado de carga inicial (`loading`) para evitar parpadeos de la UI.
 * 
 * Los componentes pueden acceder a estos datos usando el hook personalizado `useAuth()`.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Creamos el contexto vacío
const AuthContext = createContext({});

/**
 * AuthProvider
 * Componente que rodea la aplicación y suministra el estado de autenticación.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Usuario de Supabase Auth
  const [profile, setProfile] = useState(null); // Datos adicionales de la tabla 'usuarios'
  const [loading, setLoading] = useState(true); // Estado de inicialización

  useEffect(() => {
    // 1. Verificar si ya existe una sesión activa al cargar la página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Suscribirse a cambios en el estado de autenticación (Login, Logout, Token renovado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Limpiar suscripción al desmontar el componente
    return () => subscription.unsubscribe();
  }, []);

  /**
   * fetchUserProfile
   * Obtiene los datos del perfil del usuario desde la tabla 'usuarios'
   * incluyendo el nombre del perfil asociado.
   * 
   * @param {string} userId - UUID del usuario en Supabase Auth
   */
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          perfiles ( nombre )
        `)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // Mapeamos el rol para facilitar su acceso en la app
      setProfile({
        ...data,
        rol: data.perfiles?.nombre || 'residente'
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * getAuthErrorMessage
   * Convierte los errores de Supabase en mensajes amigables.
   */
  const getAuthErrorMessage = (error) => {
    const message = error.message?.toLowerCase() || '';
    const details = error.details?.toLowerCase() || '';
    
    // Credenciales inválidas
    if (message.includes('invalid login credentials') || details.includes('invalid login credentials')) {
      return { type: 'invalid_credentials', message: 'El correo o contraseña son incorrectos. Verifica tus datos e intenta nuevamente.' };
    }
    
    // Usuario no existe
    if (message.includes('user not found') || details.includes('user not found')) {
      return { type: 'user_not_found', message: 'Este usuario no existe en el sistema. Contacta a administración.' };
    }
    
    // Email no confirmado
    if (message.includes('email not confirmed') || details.includes('email not confirmed')) {
      return { type: 'email_not_confirmed', message: 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.' };
    }
    
    // Demasiados intentos fallidos
    if (message.includes('too many requests') || details.includes('too many requests')) {
      return { type: 'too_many_attempts', message: 'Demasiados intentos fallidos. Intenta más tarde.' };
    }
    
    // Usuario deshabilitado
    if (message.includes('disabled') || details.includes('disabled')) {
      return { type: 'user_disabled', message: 'Tu cuenta ha sido deshabilitada. Contacta a administración.' };
    }
    
    // Error genérico
    return { type: 'generic_error', message: error.message || error.details || 'Error de autenticación. Intenta nuevamente.' };
  };

  /**
   * signIn
   * Intenta iniciar sesión con email y contraseña.
   * NO modifica setLoading para no bloquear la interfaz durante el login.
   */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const errorInfo = getAuthErrorMessage(error);
      const err = new Error(errorInfo.message);
      err.type = errorInfo.type;
      throw err;
    }
    return data;
  };

  /**
   * signOut
   * Cierra la sesión activa en Supabase.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // El proveedor pasa las funciones y datos a sus descendientes
  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {/* Solo renderizamos los hijos una vez que terminó de verificar la sesión inicial */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth
 * Hook personalizado para utilizar el contexto de forma sencilla.
 * @returns {object} { user, profile, loading, signIn, signOut }
 */
export const useAuth = () => {
  return useContext(AuthContext);
};
