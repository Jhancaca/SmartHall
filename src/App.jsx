/**
 * App.jsx
 * ─────────────────────────────────────────────────────────
 * Archivo raíz de la aplicación React de SmartHall.
 * Se encarga de:
 *  1. Definir el sistema de rutas con react-router-dom.
 *  2. Proteger rutas privadas mediante el componente PrivateRoute.
 *  3. Redirigir al usuario según su estado de sesión y rol.
 *
 * Estructura de rutas:
 *  /login         → Pantalla de inicio de sesión (pública)
 *  /              → Dashboard principal (privado, todos los roles)
 *  /usuarios      → Gestión de usuarios (privado, solo administrador)
 *  /inventario    → Inventario de insumos (privado, todos los roles)
 *  /reservas      → Módulo de reservas (próximamente)
 *  /configuracion → Módulo de configuración (próximamente, solo administrador)
 *  *              → Redirige a / (ruta no encontrada)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Inventario from './pages/Inventario';
import Reservas from './pages/Reservas';
import NuevaReserva from './pages/NuevaReserva';
import AprobacionReservas from './pages/AprobacionReservas';
import GestionPrestamos from './pages/GestionPrestamos';
import CalendarioReservas from './pages/CalendarioReservas';
import Configuracion from './pages/Configuracion';
import InsumosResidente from './pages/InsumosResidente';

/**
 * PrivateRoute
 * ─────────────────────────────────────────────────────────
 * Componente HOC (Higher-Order Component) que protege las rutas privadas.
 * Comprueba si el usuario tiene sesión activa y, opcionalmente, valida
 * que su rol esté incluido en `allowedRoles`.
 *
 * @param {React.ReactNode} children     - Componente hijo protegido
 * @param {string[]}        allowedRoles - Roles permitidos (opcional).
 *                                         Si no se pasa, cualquier rol autenticado puede acceder.
 */
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  // Mientras se carga la sesión, muestra un mensaje temporal
  if (loading) return <div style={{ padding: '2rem' }}>Cargando sesión...</div>;

  // Si no hay usuario autenticado → redirige al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si se especificaron roles y el usuario no pertenece a ninguno → redirige al dashboard
  if (allowedRoles && profile && !allowedRoles.includes(profile.rol)) {
    return <Navigate to="/" replace />;
  }

  // Usuario autenticado y con rol permitido → renderiza la ruta dentro del Layout
  return <Layout>{children}</Layout>;
};

/**
 * App
 * ─────────────────────────────────────────────────────────
 * Componente principal que configura el enrutador de la aplicación.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública: Login */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard: visible para todos los roles autenticados */}
        <Route path="/" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        {/* Gestión de usuarios: exclusivo para el rol administrador */}
        <Route path="/usuarios" element={
          <PrivateRoute allowedRoles={['administrador']}>
            <Usuarios />
          </PrivateRoute>
        } />

        {/* Catálogo de Insumos (Residente) */}
        <Route path="/insumos" element={
          <PrivateRoute>
            <InsumosResidente />
          </PrivateRoute>
        } />

        {/* Inventario: Gestión administrativa */}
        <Route path="/inventario" element={
          <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
            <Inventario />
          </PrivateRoute>
        } />

        {/* Reservas: listado de reservas */}
        <Route path="/reservas" element={
          <PrivateRoute>
            <Reservas />
          </PrivateRoute>
        } />

        {/* Nueva Reserva: formulario */}
        <Route path="/reservas/nueva" element={
          <PrivateRoute>
            <NuevaReserva />
          </PrivateRoute>
        } />

        {/* Calendario de Reservas: vista mensual */}
        <Route path="/reservas/calendario" element={
          <PrivateRoute>
            <CalendarioReservas />
          </PrivateRoute>
        } />

        {/* Aprobación de Reservas: admin y supervisor */}
        <Route path="/admin/aprobaciones" element={
          <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
            <AprobacionReservas />
          </PrivateRoute>
        } />

        {/* Gestión de Préstamos: admin y supervisor */}
        <Route path="/admin/prestamos" element={
          <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
            <GestionPrestamos />
          </PrivateRoute>
        } />

        {/* Configuración: solo admin */}
        <Route path="/configuracion" element={
          <PrivateRoute allowedRoles={['administrador']}>
            <Configuracion />
          </PrivateRoute>
        } />

        {/* Cualquier ruta no definida redirige al dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
