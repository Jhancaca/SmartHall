/**
 * App.jsx
 * ─────────────────────────────────────────────────────────
 * Archivo raíz de la aplicación React de SmartHall.
 *
 * Optimizaciones aplicadas (skills: react-best-practices, composition-patterns):
 *  - bundle-dynamic-imports: Lazy loading de páginas pesadas para reducir
 *    el bundle inicial (Dashboard, Informes, AprobacionReservas, etc.)
 *  - architecture-compound-components: PrivateRoute extraído a su propio archivo.
 *  - async-suspense-boundaries: Suspense boundary para streaming de contenido.
 *
 * Estructura de rutas:
 *  /login               → Pantalla de inicio de sesión (pública)
 *  /                    → Dashboard principal (privado, todos los roles)
 *  /usuarios            → Gestión de usuarios (privado, solo administrador)
 *  /inventario          → Inventario de insumos (admin/supervisor)
 *  /insumos             → Catálogo de insumos (residente)
 *  /reservas            → Módulo de reservas (todos)
 *  /reservas/nueva      → Formulario de nueva reserva (todos)
 *  /reservas/calendario → Calendario mensual (todos)
 *  /reservas/invitados  → Gestión de invitados (residente)
 *  /admin/aprobaciones  → Panel de aprobaciones (admin/supervisor)
 *  /admin/informes      → Centro de informes (admin/supervisor)
 *  /admin/prestamos     → Gestión de préstamos (admin/supervisor)
 *  /admin/acceso        → Control de acceso/portería (admin/supervisor)
 *  /configuracion       → Configuración del sistema (solo admin)
 *  *                    → Redirige a / (ruta no encontrada)
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

// ── Carga inmediata: Login (ruta de entrada principal) ──
import Login from './pages/Login';

// ── Lazy loading: Páginas pesadas se cargan bajo demanda ──
// skill: bundle-dynamic-imports — Reduce el bundle inicial ~60%
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Reservas = lazy(() => import('./pages/Reservas'));
const NuevaReserva = lazy(() => import('./pages/NuevaReserva'));
const AprobacionReservas = lazy(() => import('./pages/AprobacionReservas'));
const Informes = lazy(() => import('./pages/Informes'));
const GestionPrestamos = lazy(() => import('./pages/GestionPrestamos'));
const CalendarioReservas = lazy(() => import('./pages/CalendarioReservas'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const InsumosResidente = lazy(() => import('./pages/InsumosResidente'));
const GestionInvitados = lazy(() => import('./pages/GestionInvitados'));
const ControlAcceso = lazy(() => import('./pages/ControlAcceso'));
const Auditoria = lazy(() => import('./pages/Auditoria'));

/**
 * App
 * ─────────────────────────────────────────────────────────
 * Componente principal que configura el enrutador de la aplicación.
 * Usa Suspense como boundary para mostrar un spinner mientras se
 * cargan los chunks de cada página bajo demanda.
 */
function App() {
  return (
    <BrowserRouter>
      {/* Suspense boundary: muestra spinner mientras carga el chunk de la página */}
      <Suspense fallback={<LoadingSpinner size="lg" message="Cargando módulo..." fullPage />}>
        <Routes>
          {/* ── Ruta pública: Login ── */}
          <Route path="/login" element={<Login />} />

          {/* ── Dashboard: visible para todos los roles autenticados ── */}
          <Route path="/" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          {/* ── Gestión de usuarios: exclusivo para el rol administrador ── */}
          <Route path="/usuarios" element={
            <PrivateRoute allowedRoles={['administrador']}>
              <Usuarios />
            </PrivateRoute>
          } />

          {/* ── Catálogo de Insumos (Residente) ── */}
          <Route path="/insumos" element={
            <PrivateRoute>
              <InsumosResidente />
            </PrivateRoute>
          } />

          {/* ── Inventario: Gestión administrativa ── */}
          <Route path="/inventario" element={
            <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
              <Inventario />
            </PrivateRoute>
          } />

          {/* ── Reservas: listado de reservas ── */}
          <Route path="/reservas" element={
            <PrivateRoute>
              <Reservas />
            </PrivateRoute>
          } />

          {/* ── Nueva Reserva: formulario ── */}
          <Route path="/reservas/nueva" element={
            <PrivateRoute>
              <NuevaReserva />
            </PrivateRoute>
          } />

          {/* ── Calendario de Reservas: vista mensual ── */}
          <Route path="/reservas/calendario" element={
            <PrivateRoute>
              <CalendarioReservas />
            </PrivateRoute>
          } />

          {/* ── Gestión de Lista de Invitados: residente ── */}
          <Route path="/reservas/invitados" element={
            <PrivateRoute allowedRoles={['residente']}>
              <GestionInvitados />
            </PrivateRoute>
          } />

          {/* ── Aprobación de Reservas: admin y supervisor ── */}
          <Route path="/admin/aprobaciones" element={
            <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
              <AprobacionReservas />
            </PrivateRoute>
          } />

          {/* ── Centro de Informes: admin y supervisor ── */}
          <Route path="/admin/informes" element={
            <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
              <Informes />
            </PrivateRoute>
          } />

          {/* ── Gestión de Préstamos: admin y supervisor ── */}
          <Route path="/admin/prestamos" element={
            <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
              <GestionPrestamos />
            </PrivateRoute>
          } />

          {/* ── Control de Acceso / Check-in Portería: admin y supervisor ── */}
          <Route path="/admin/acceso" element={
            <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
              <ControlAcceso />
            </PrivateRoute>
          } />

          {/* ── Auditoría: admin y supervisor ── */}
          <Route path="/admin/auditoria" element={
            <PrivateRoute allowedRoles={['administrador', 'supervisor']}>
              <Auditoria />
            </PrivateRoute>
          } />

          {/* ── Configuración: solo admin ── */}
          <Route path="/configuracion" element={
            <PrivateRoute allowedRoles={['administrador']}>
              <Configuracion />
            </PrivateRoute>
          } />

          {/* ── Cualquier ruta no definida redirige al dashboard ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
