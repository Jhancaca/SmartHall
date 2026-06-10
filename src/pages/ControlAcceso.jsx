/**
 * ControlAcceso.jsx
 * ─────────────────────────────────────────────────────────
 * Página principal de Control de Acceso y Check-in digital para el personal
 * de portería (supervisor) y administradores del sistema SmartHall.
 *
 * PROPÓSITO:
 *  Permite al personal de portería verificar el ingreso de invitados programados
 *  para el día actual en el salón social del conjunto residencial. Registra
 *  timestamps de entrada/salida y ofrece un panel de aforo en tiempo real.
 *
 * FLUJO DE TRABAJO (Check-in / Check-out):
 *  1. Al cargar, se obtienen automáticamente todas las reservas aprobadas para HOY
 *     y sus invitados asociados mediante el hook `useInvitados.obtenerInvitadosDeHoy()`.
 *  2. La query de TanStack Query se re-sincroniza cada 15 segundos (refetchInterval)
 *     para mantener actualizado el estado de ingresos en la BD de Supabase.
 *  3. El portero busca al invitado por documento, nombre o residente asociado.
 *  4. Al presionar "Dar Ingreso", se actualiza `estado_acceso` a 'ingresado' y se
 *     registra la fecha/hora en `ingresado_a_las`.
 *  5. Si el invitado ya ingresó, se muestra el botón "Deshacer" para revertir el
 *     estado a 'pendiente' y limpiar el timestamp.
 *  6. Los contadores de aforo (total, ingresados, pendientes) se recalculan
 *     automáticamente en cada ciclo de render.
 *
 * HOOKS Y APIS UTILIZADOS:
 *  - useAuth(): Obtiene el perfil del usuario autenticado y su rol (para permisos).
 *  - useInvitados(): Hook de TanStack Query que gestiona la tabla 'invitados_reserva'
 *    en Supabase, incluyendo queries, mutaciones y caching.
 *  - useQuery (TanStack): Para la carga y auto-refetch de datos.
 *  - useMemo: Para cálculos derivados (aforo, filtrado) con memoización.
 *  - useState: Para el estado local del filtro y mensajes de retroalimentación.
 *
 * COMPONENTES UI:
 *  - Cabecera con botón de sincronización manual.
 *  - Panel de KPIs (aforo esperado, ingresados, pendientes).
 *  - Barra de búsqueda predictiva por documento/nombre/residente/apto.
 *  - Tabla de invitados con acciones de check-in/check-out.
 *  - Tarjeta de acceso denegado para usuarios sin permisos.
 *
 * NOTA: Este componente NO recibe props. Todo su estado es local o se obtiene
 *       de hooks y contextos globales.
 */

/**
 * Importaciones de React y hooks nativos:
 *  - useState: Estado local para el filtro de búsqueda y mensajes de feedback.
 *  - useMemo: Memoización de cálculos derivados (aforo y lista filtrada).
 */
import React, { useState, useMemo } from 'react';

/**
 * Contexto de autenticación: provee el perfil del usuario logueado (profile)
 * para validar su rol (administrador, supervisor) y controlar el acceso a esta página.
 */
import { useAuth } from '../context/AuthContext';

/**
 * Hook personalizado useInvitados: centraliza la comunicación con la tabla
 * 'invitados_reserva' en Supabase a través de TanStack React Query.
 * Provee: obtenerInvitadosDeHoy (query con auto-refetch) y registrarCheckIn (mutación).
 */
import { useInvitados } from '../hooks/useInvitados';

/**
 * Iconos de Lucide React utilizados en la interfaz:
 *  - ShieldCheck: Logo de seguridad en la cabecera.
 *  - Search: Icono del campo de búsqueda.
 *  - UserCheck/UserMinus: Botones de check-in (ingresar) / check-out (deshacer).
 *  - Clock: Indicador de hora de ingreso.
 *  - Home: Icono junto al número de apartamento del residente.
 *  - CheckCircle/AlertTriangle: Estados de éxito y error en alertas.
 *  - Users: KPI de total de invitados.
 *  - RefreshCw: Botón de sincronización manual.
 *  - TrendingUp: Importado pero no utilizado activamente en el JSX.
 */
import {
  ShieldCheck,
  Search,
  UserCheck,
  UserMinus,
  Clock,
  Home,
  CheckCircle,
  Users,
  AlertTriangle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

/**
 * Componente principal ControlAcceso.
 *
 * @description Página de control de acceso para portería. No recibe props.
 * Accede al contexto de autenticación y al hook de invitados para gestionar
 * el flujo de check-in/check-out de invitados programados para el día actual.
 *
 * @returns {JSX.Element} Panel completo de control de acceso, o tarjeta de
 * acceso denegado si el usuario no tiene el rol adecuado.
 */
const ControlAcceso = () => {
  /**
   * Perfil del usuario autenticado, obtenido del AuthContext.
   * Se utiliza para verificar el rol del usuario (administrador o supervisor)
   * y autorizar el acceso a esta página de portería.
   */
  const { profile } = useAuth();
  
  // ────────────────────────────────────────────────────────
  // Estados Locales del componente
  // ────────────────────────────────────────────────────────

  /**
   * Texto de búsqueda introducido por el portero en el campo de filtrado.
   * Se usa para filtrar la lista de invitados en tiempo real por nombre,
   * documento, residente asociado o número de apartamento.
   * Valor inicial: cadena vacía (sin filtro).
   */
  const [filtroTexto, setFiltroTexto] = useState('');

  /**
   * Mensaje de retroalimentación local que se muestra al usuario después
   * de realizar una acción (check-in, error, etc.).
   * Estructura: { tipo: 'success' | 'error' | '', texto: string }
   * Se limpia automáticamente después de 3 segundos en handleCheckIn.
   */
  const [mensajeLocal, setMensajeLocal] = useState({ tipo: '', texto: '' });

  // ────────────────────────────────────────────────────────
  // Hook de Invitados (sin ID de reserva específico)
  // ────────────────────────────────────────────────────────
  /**
   * Desestructuración del hook useInvitados.
   *  - obtenerInvitadosDeHoy: Función que retorna un objeto useQuery con los
   *    invitados de reservas aprobadas para la fecha actual. Incluye auto-refetch
   *    cada 15 segundos para sincronización en tiempo real con la BD.
   *  - registrarCheckIn: Función mutadora (mutateAsync) que actualiza el estado
   *    de acceso de un invitado en la tabla 'invitados_reserva'.
   *  - registrando: Booleano que indica si una mutación de check-in está en curso.
   */
  const { obtenerInvitadosDeHoy, registrarCheckIn, registrando } = useInvitados();

  /**
   * Datos de la query de TanStack Query para invitados de hoy.
   *  - invitadosHoy: Array de objetos invitado con datos de reserva anidados.
   *    Cada objeto contiene: id, nombre_completo, documento_identidad,
   *    estado_acceso, ingresado_a_las, reserva (con usuarios: nombres, apellidos, numero_apto).
   *  - cargandoInvitados: TRUE mientras se carga la query por primera vez.
   *  - recargarInvitados: Función para forzar una recarga manual de los datos.
   *  - isFetching: TRUE mientras se está realizando cualquier fetch (incluyendo auto-refetch).
   *
   * MECANISMO DE AUTO-REFRESH (15 segundos):
   *  La query configurada en obtenerInvitadosDeHoy() tiene un refetchInterval de
   *  15000ms (15 segundos). Esto significa que TanStack Query re-ejecuta la query
   *  automáticamente cada 15 segundos, manteniendo los datos sincronizados con la
   *  base de datos de Supabase. Esto es crítico para el uso en portería, donde
   *  múltiples porteros pueden estar registrando ingresos simultáneamente y cada
   *  uno necesita ver los datos más actualizados. El botón "Sincronizar" permite
   *  una recarga manual inmediata fuera del intervalo programado.
   */
  const {
    data: invitadosHoy = [],
    isLoading: cargandoInvitados,
    refetch: recargarInvitados,
    isFetching
  } = obtenerInvitadosDeHoy();

  // ────────────────────────────────────────────────────────
  // 1. Cálculos de Aforo en Tiempo Real (HOY)
  // ────────────────────────────────────────────────────────

  /**
   * Memoización de las estadísticas de aforo del día actual.
   *
   * @description Calcula tres métricas clave a partir del array de invitadosHoy:
   *  - total: Cantidad total de invitados programados para hoy.
   *  - ingresados: Cantidad de invitados con estado_acceso === 'ingresado'.
   *  - pendientes: Diferencia entre total e ingresados (los que aún no han llegado).
   *
   * Se recalcula únicamente cuando cambia invitadosHoy (optimización con useMemo).
   * Estos valores alimentan los KPIs del panel de aforo en la cabecera de la página.
   *
   * @returns {{ total: number, ingresados: number, pendientes: number }}
   */
  const aforoHoy = useMemo(() => {
    const total = invitadosHoy.length;
    const ingresados = invitadosHoy.filter(i => i.estado_acceso === 'ingresado').length;
    const pendientes = total - ingresados;
    
    return {
      total,
      ingresados,
      pendientes
    };
  }, [invitadosHoy]);

  // ────────────────────────────────────────────────────────
  // 2. Filtrado de Invitados (Búsqueda Predictiva)
  // ────────────────────────────────────────────────────────

  /**
   * Memoización de la lista de invitados filtrados según el texto de búsqueda.
   *
   * @description Implementa una búsqueda predictiva insensible a mayúsculas/minúsculas
   * que coincide contra cuatro campos de cada invitado:
   *  1. nombre_completo: Nombre completo del invitado.
   *  2. documento_identidad: Número de documento de identidad.
   *  3. residente (nombres + apellidos): Nombre del residente que agendó la visita.
   *  4. numero_apto: Número de apartamento del residente asociado.
   *
   * Si el filtro está vacío, retorna todos los invitados sin procesamiento adicional.
   * Se recalcula solo cuando cambian invitadosHoy o filtroTexto.
   *
   * @returns {Array} Subconjunto de invitados que coinciden con la query de búsqueda.
   */
  const invitadosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return invitadosHoy;
    const query = filtroTexto.toLowerCase();
    
    return invitadosHoy.filter(inv => {
      const nombre = (inv.nombre_completo || '').toLowerCase();
      const doc = (inv.documento_identidad || '').toLowerCase();
      const residente = `${inv.reserva?.usuarios?.nombres || ''} ${inv.reserva?.usuarios?.apellidos || ''}`.toLowerCase();
      const apto = (inv.reserva?.usuarios?.numero_apto || '').toLowerCase();
      
      return nombre.includes(query) || doc.includes(query) || residente.includes(query) || apto.includes(query);
    });
  }, [invitadosHoy, filtroTexto]);

  // ────────────────────────────────────────────────────────
  // Handlers (Manejadores de Eventos)
  // ────────────────────────────────────────────────────────

  /**
   * Handler para registrar o deshacer el check-in de un invitado.
   *
   * @description Ejecuta la mutación de check-in a través del hook useInvitados.
   * Flujo interno:
   *  1. Limpia cualquier mensaje de retroalimentación previo.
   *  2. Invoca registrarCheckIn() con el ID del invitado y el estado deseado.
   *  3. Si el estado es 'ingresado': marca al invitado como dentro del salón y
   *     registra la fecha/hora actual en ingresado_a_las.
   *  4. Si el estado es 'pendiente': revierte el ingreso y limpia ingresado_a_las.
   *  5. Muestra un mensaje de éxito o error durante 3 segundos (setTimeout).
   *
   * La mutación en useInvitados automáticamente invalida la caché de TanStack
   * Query para ['invitados', 'hoy'] y la reserva específica, lo que provoca
   * un refetch de los datos actualizados.
   *
   * @param {string|number} invitadoId - ID único del invitado en la tabla invitados_reserva.
   * @param {string} estadoIngreso - Nuevo estado: 'ingresado' para check-in, 'pendiente' para check-out.
   * @returns {Promise<void>} No retorna valor. Los errores se capturan y se muestran en mensajeLocal.
   */
  const handleCheckIn = async (invitadoId, estadoIngreso) => {
    // Limpiar mensaje anterior antes de procesar
    setMensajeLocal({ tipo: '', texto: '' });
    try {
      // Ejecutar la mutación de check-in/check-out en Supabase
      await registrarCheckIn({
        invitadoId,
        estado: estadoIngreso
      });
      // Mostrar mensaje de éxito según la acción realizada
      setMensajeLocal({
        tipo: 'success',
        texto: estadoIngreso === 'ingresado' ? 'Ingreso registrado con éxito.' : 'Ingreso cancelado/salida registrada.'
      });
      // Auto-limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => setMensajeLocal({ tipo: '', texto: '' }), 3000);
    } catch (err) {
      // Capturar y mostrar errores de la mutación (ej: error de red, de Supabase)
      setMensajeLocal({
        tipo: 'error',
        texto: err.message || 'Error al procesar el check-in.'
      });
    }
  };

  // ────────────────────────────────────────────────────────
  // Control de acceso: Solo personal autorizado
  // ────────────────────────────────────────────────────────
  /**
   * Guard clause: Verificación de permisos del usuario.
   * Solo los usuarios con rol 'administrador' o 'supervisor' (personal de portería)
   * pueden acceder a esta página de control de acceso. Si el usuario no tiene
   * uno de estos roles, se renderiza una tarjeta de "Acceso Denegado" en lugar
   * del panel completo de control.
   */
  if (!['administrador', 'supervisor'].includes(profile?.rol)) {
    return (
      <div style={styles.accesoNegadoContainer}>
        <div style={styles.accesoNegadoCard}>
          <AlertTriangle size={48} color="var(--danger)" />
          <h2>Acceso Denegado</h2>
          <p>Esta sección es exclusiva para el personal de portería, supervisores o administradores.</p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // Renderizado principal del panel de control de acceso
  // ────────────────────────────────────────────────────────
  return (
    <div className="fade-in" style={styles.container}>
      
      {/* ─── Cabecera ─── */}
      {/* Barra superior con logo, título y botón de sincronización manual */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.logoBadge}>
            <ShieldCheck size={24} color="#FFFFFF" />
          </div>
          <div>
            <h1 style={styles.titulo}>Control de Acceso (Check-in Portería)</h1>
            <p style={styles.subtitulo}>Verifica el ingreso de invitados de residentes registrados para el día de hoy.</p>
          </div>
        </div>

        {/*
          Botón de sincronización manual.
          Permite al portero forzar una recarga inmediata de los datos de invitados
          de hoy, sin esperar el intervalo de auto-refetch de 15 segundos.
          El ícono rota (clase CSS 'spin') mientras isFetching es TRUE.
        */}
        <button onClick={() => recargarInvitados()} style={styles.btnSync} title="Sincronizar ahora">
          <RefreshCw size={16} className={isFetching ? 'spin' : ''} />
          Sincronizar
        </button>
      </header>

      {/* ─── Panel de Aforo / Dashboard de Portería ─── */}
      {/* Grid responsivo de 3 KPIs que muestra métricas de aforo en tiempo real.
          Se actualiza automáticamente gracias a la memoización de aforoHoy
          y al auto-refetch de TanStack Query cada 15 segundos. */}
      <section style={styles.aforoGrid}>
        
        {/* KPI 1: Total de invitados programados para hoy (reservas aprobadas) */}
        {/* Muestra la suma de todos los invitados de todas las reservas aprobadas del día. */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <Users size={22} color="#3B82F6" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Aforo Esperado Hoy</p>
            <h2 style={{ ...styles.kpiValue, color: '#1E293B' }}>{aforoHoy.total}</h2>
            <p style={styles.kpiSub}>Total programados</p>
          </div>
        </div>

        {/* KPI 2: Invitados que ya ingresaron al salón social */}
        {/* Conteo de invitados con estado_acceso === 'ingresado' en la BD. */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <UserCheck size={22} color="#10B981" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Aforo Ingresado</p>
            <h2 style={{ ...styles.kpiValue, color: '#10B981' }}>{aforoHoy.ingresados}</h2>
            <p style={styles.kpiSub}>Dentro del salón social</p>
          </div>
        </div>

        {/* KPI 3: Invitados que aún no han llegado */}
        {/* Calculado como total - ingresados. Se actualiza en cada render. */}
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <Clock size={22} color="#F59E0B" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Pendientes de Ingreso</p>
            <h2 style={{ ...styles.kpiValue, color: '#F59E0B' }}>{aforoHoy.pendientes}</h2>
            <p style={styles.kpiSub}>Aún por llegar</p>
          </div>
        </div>
      </section>

      {/* ─── Alertas locales de retroalimentación ─── */}
      {/* Muestra mensajes de éxito o error después de ejecutar una acción de check-in.
          Se renderiza condicionalmente cuando mensajeLocal.texto tiene contenido.
          Los estilos (colores de fondo, texto y borde) cambian según el tipo. */}
      {mensajeLocal.texto && (
        <div style={{
          ...styles.alerta,
          backgroundColor: mensajeLocal.tipo === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: mensajeLocal.tipo === 'success' ? '#059669' : '#DC2626',
          borderColor: mensajeLocal.tipo === 'success' ? '#A7F3D0' : '#FCA5A5'
        }}>
          {mensajeLocal.tipo === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{mensajeLocal.texto}</span>
        </div>
      )}

      {/* ─── Filtro y Buscador predictivo ─── */}
      {/* Campo de búsqueda que filtra la lista de invitados en tiempo real.
          Busca por: nombre completo, documento de identidad, nombre del residente
          asociado o número de apartamento. El filtrado se realiza en el cliente
          (client-side) a través del useMemo invitadosFiltrados. */}
      <section style={styles.filtroCard}>
        <div style={styles.buscadorWrapper}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar invitado por documento, nombre o residente asociado..."
            value={filtroTexto}
            onChange={e => setFiltroTexto(e.target.value)}
            style={styles.buscadorInput}
          />
        </div>
      </section>

      {/* ─── Listado Principal de Portería ─── */}
      {/* Sección principal que muestra la tabla de invitados del día.
          Renderiza uno de tres estados posibles:
          1. Cargando: Spinner animado mientras se obtienen los datos de Supabase.
          2. Sin resultados: Mensaje cuando no hay invitados o el filtro no coincide.
          3. Tabla de datos: Lista completa de invitados con acciones de check-in/check-out.
          
          La tabla se genera a partir de invitadosFiltrados (resultado del useMemo).
          Cada fila muestra: nombre, documento, residente/apto, evento, hora de ingreso,
          y un botón de acción (Dar Ingreso o Deshacer según el estado_acceso). */}
      <main style={styles.tablaCard}>
        {cargandoInvitados ? (
          <div style={styles.cargandoContenedor}>
            <div className="spinner" style={styles.spinner} />
            <p>Compilando lista de ingresos de hoy...</p>
          </div>
        ) : invitadosFiltrados.length === 0 ? (
          <div style={styles.sinResultados}>
            <Users size={48} color="#94A3B8" />
            <h3>No se encontraron invitados agendados</h3>
            <p>
              {filtroTexto.trim()
                ? 'Prueba modificando los términos del buscador predictivo.'
                : 'No hay eventos aprobados programados para el día de hoy.'}
            </p>
          </div>
        ) : (
          <div style={styles.tablaWrapper}>
            <table style={styles.tabla}>
              <thead>
                <tr style={styles.filaEncabezado}>
                  <th style={styles.celdaEncabezado}>Invitado</th>
                  <th style={styles.celdaEncabezado}>Documento</th>
                  <th style={styles.celdaEncabezado}>Residente / Apto</th>
                  <th style={styles.celdaEncabezado}>Evento / Reserva</th>
                  <th style={styles.celdaEncabezado}>Hora Ingreso</th>
                  <th style={{ ...styles.celdaEncabezado, textAlign: 'center' }}>Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody>
                {/*
                  Mapeo de invitados filtrados para renderizar cada fila de la tabla.
                  Cada invitado se renderiza como una <tr> con fondo verde claro (#F0FDF4)
                  si ya ingresó, o transparente si está pendiente.
                  La key se asigna con inv.id (ID único de la tabla invitados_reserva).
                */}
                {invitadosFiltrados.map(inv => {
                  // Bandera para determinar el estado visual y el botón a mostrar
                  const yaIngreso = inv.estado_acceso === 'ingresado';
                  return (
                    <tr key={inv.id} style={{
                      ...styles.fila,
                      backgroundColor: yaIngreso ? '#F0FDF4' : 'transparent'
                    }}>
                      {/* Columna: Nombre del invitado */}
                      <td style={styles.celda}>
                        <div style={styles.celdaDobleLine}>
                          <span style={{ ...styles.lineaPrincipal, fontWeight: '700' }}>{inv.nombre_completo}</span>
                          <span style={styles.lineaSecundaria}>Registro digital de acceso</span>
                        </div>
                      </td>
                      {/* Columna: Documento de identidad del invitado */}
                      <td style={styles.celda}>
                        <span style={styles.documentoText}>{inv.documento_identidad}</span>
                      </td>
                      {/* Columna: Residente que agendó la visita y su apartamento */}
                      <td style={styles.celda}>
                        <div style={styles.celdaDobleLine}>
                          <span style={styles.lineaPrincipal}>
                            {inv.reserva?.usuarios?.nombres} {inv.reserva?.usuarios?.apellidos}
                          </span>
                          <span style={{ ...styles.lineaSecundaria, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Home size={12} /> Apto {inv.reserva?.usuarios?.numero_apto}
                          </span>
                        </div>
                      </td>
                      {/* Columna: Tipo de evento de la reserva */}
                      <td style={styles.celda}>
                        <span style={styles.eventoText}>{inv.reserva?.tipo_evento || 'Salón Social'}</span>
                      </td>
                      {/* Columna: Hora de ingreso registrada (o "Sin ingresar") */}
                      {/* Si el invitado ya ingresó, muestra la hora formateada en español.
                          Si no, muestra un texto en itálica indicando que no ha ingresado. */}
                      <td style={styles.celda}>
                        {inv.ingresado_a_las ? (
                          <div style={{ ...styles.celdaDobleLine, color: '#059669' }}>
                            <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Ingresó
                            </span>
                            <span style={styles.lineaSecundaria}>
                              {new Date(inv.ingresado_a_las).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#64748B', fontStyle: 'italic' }}>Sin ingresar</span>
                        )}
                      </td>
                      {/* Columna: Acciones rápidas de check-in / check-out */}
                      {/* Botón condicional según el estado del invitado:
                          - Si NO ha ingresado: Botón verde "Dar Ingreso" → llama a handleCheckIn con estado 'ingresado'.
                          - Si YA ingresó: Botón gris "Deshacer" → llama a handleCheckIn con estado 'pendiente'.
                          Ambos botones se deshabilitan (disabled) mientras registrando es TRUE (mutación en curso). */}
                      <td style={{ ...styles.celda, textAlign: 'center' }}>
                        <div style={styles.accionesFlex}>
                          {!yaIngreso ? (
                            <button
                              onClick={() => handleCheckIn(inv.id, 'ingresado')}
                              disabled={registrando}
                              style={styles.btnCheckIn}
                            >
                              <UserCheck size={16} />
                              Dar Ingreso
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(inv.id, 'pendiente')}
                              disabled={registrando}
                              style={styles.btnCheckOut}
                            >
                              <UserMinus size={16} />
                              Deshacer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ─── Keyframes de CSS animado ─── */}
      {/* Estilos CSS embebidos para animaciones:
          - .spin: Rotación continua del ícono RefreshCw durante la sincronización.
          - .spinner: Indicador de carga circular (border animado) para el estado de loading.
          Estos estilos se inyectan directamente en el DOM del componente. */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1.5s linear infinite;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #E2E8F0;
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

// ────────────────────────────────────────────────────────
// Objeto de estilos CSS-in-JS para el componente ControlAcceso.
// Todos los estilos están centralizados aquí para facilitar
// el mantenimiento y la personalización visual.
// Se usan variables CSS (var(--primary), etc.) para theming.
// ────────────────────────────────────────────────────────
const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1.5rem'
  },
  logoBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '10px',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
  },
  titulo: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#0F172A',
    margin: 0,
    letterSpacing: '-0.025em'
  },
  subtitulo: {
    fontSize: '0.95rem',
    color: '#64748B',
    margin: '0.25rem 0 0 0'
  },
  btnSync: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '42px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '10px',
    padding: '0 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    ':hover': {
      backgroundColor: '#F8FAFC',
      color: 'var(--primary)'
    }
  },
  aforoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  },
  kpiIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  kpiLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0
  },
  kpiValue: {
    fontSize: '1.75rem',
    fontWeight: '800',
    margin: '2px 0'
  },
  kpiSub: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    margin: 0
  },
  alerta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '1.5rem'
  },
  filtroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '1rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  },
  buscadorWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    height: '44px',
    padding: '0 1rem',
    gap: '10px'
  },
  buscadorInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    backgroundColor: 'transparent',
    fontSize: '0.9rem',
    color: '#0F172A'
  },
  tablaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },
  cargandoContenedor: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6rem 0',
    gap: '1rem',
    color: '#64748B'
  },
  sinResultados: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6rem 2rem',
    textAlign: 'center',
    color: '#64748B',
    gap: '0.5rem'
  },
  tablaWrapper: {
    overflowX: 'auto'
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  filaEncabezado: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0'
  },
  celdaEncabezado: {
    padding: '1rem 1.5rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  fila: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.2s'
  },
  celda: {
    padding: '1.25rem 1.5rem',
    fontSize: '0.875rem',
    color: '#334155'
  },
  celdaDobleLine: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  lineaPrincipal: {
    fontWeight: '600',
    color: '#0F172A'
  },
  lineaSecundaria: {
    fontSize: '0.75rem',
    color: '#64748B'
  },
  documentoText: {
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'monospace',
    fontSize: '0.95rem'
  },
  eventoText: {
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  accionesFlex: {
    display: 'flex',
    justifyContent: 'center'
  },
  btnCheckIn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '0.825rem',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px 0 rgba(16, 185, 129, 0.1)',
    ':hover': {
      backgroundColor: '#059669'
    }
  },
  btnCheckOut: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#64748B',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '0.825rem',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#475569'
    }
  },
  accesoNegadoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '2rem'
  },
  accesoNegadoCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '16px',
    padding: '3rem 2rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  }
};

export default ControlAcceso;
