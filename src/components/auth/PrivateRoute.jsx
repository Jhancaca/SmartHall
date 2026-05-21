/**
 * PrivateRoute.jsx
 * ─────────────────────────────────────────────────────────
 * Componente HOC que protege rutas privadas de SmartHall.
 *
 * Patrón: architecture-compound-components (skill: composition-patterns)
 * Extraído de App.jsx para separar la lógica de autorización
 * del enrutamiento, facilitando pruebas y mantenimiento.
 *
 * Responsabilidades:
 *  1. Verificar si existe sesión activa.
 *  2. Validar que el rol del usuario esté en allowedRoles.
 *  3. Renderizar dentro del Layout si está autorizado.
 *  4. Mostrar loading spinner premium mientras carga la sesión.
 *
 * @param {React.ReactNode} children     - Componente hijo protegido
 * @param {string[]}        allowedRoles - Roles permitidos (opcional)
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../layout/Layout';
import LoadingSpinner from '../ui/LoadingSpinner';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  // Mientras se carga la sesión, muestra spinner premium
  if (loading) {
    return <LoadingSpinner size="lg" message="Verificando sesión..." fullPage />;
  }

  // Si no hay usuario autenticado → redirige al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si se especificaron roles y el usuario no pertenece → redirige al dashboard
  if (allowedRoles && profile && !allowedRoles.includes(profile.rol)) {
    return <Navigate to="/" replace />;
  }

  // Usuario autorizado → renderiza dentro del Layout
  return <Layout>{children}</Layout>;
};

export default PrivateRoute;
