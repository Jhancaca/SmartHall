/**
 * GestionInvitados.jsx
 * ─────────────────────────────────────────────────────────
 * Página de gestión de invitados para residentes del SmartHall.
 *
 * Propósito:
 *   Permite a los residentes registrar, visualizar y eliminar invitados
 *   digitales para sus eventos reservados y aprobados. La lista generada
 *   es consultada por portería para autorizar el acceso al edificio.
 *
 * Flujo de trabajo (workflow):
 *   1. El residente visualiza sus reservas aprobadas y futuras.
 *   2. Selecciona un evento específico para administrar su lista de invitados.
 *   3. El sistema carga los invitados existentes para esa reserva.
 *   4. El residente agrega nuevos invitados (nombre + documento de identidad).
 *   5. El sistema valida aforo, duplicados y campos obligatorios en tiempo real.
 *   6. El residente puede eliminar invitados que aún no han ingresado.
 *   7. Portería utiliza esta lista para controlar el acceso al edificio.
 *
 * Hooks y contexto utilizados:
 *   - useAuth(): Obtiene el usuario autenticado y su perfil (rol, id).
 *   - useReservas(usuarioId): Carga las reservas del residente.
 *   - useInvitados(reservaId): CRUD de invitados para una reserva específica.
 *   - useUIFeedback(): ShowToast y showConfirm para notificaciones y confirmaciones.
 *
 * Control de acceso:
 *   Solo usuarios con rol 'residente' pueden acceder a esta página.
 *   Usuarios con otros roles ven un mensaje de acceso denegado.
 *
 * Características Premium:
 *  - Carga automática de las reservas aprobadas del residente.
 *  - Control de aforo/afluencia: Validación en caliente que impide exceder
 *    la cantidad máxima de invitados registrada en la reserva.
 *  - Creador interactivo de invitados con validación inmediata de campos.
 *  - Lista interactiva para eliminar invitados fácilmente.
 *  - Diseño refinado y adaptable siguiendo las directrices de `frontend-design`.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReservas } from '../hooks/useReservas';
import { useInvitados } from '../hooks/useInvitados';
import { useUIFeedback } from '../context/UIFeedbackContext';
import {
  Users,
  UserPlus,
  Trash2,
  Calendar,
  AlertCircle,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Inbox,
  AlertTriangle
} from 'lucide-react';

/**
 * GestionInvitados - Componente principal de gestión de invitados.
 *
 * Renderiza una interfaz de dos paneles:
 *   - Panel izquierdo: Lista de reservas aprobadas y futuras del residente.
 *   - Panel derecho: Formulario de agregar invitado, dashboard de aforo
 *     y tabla de invitados registrados para la reserva seleccionada.
 *
 * Flujo de renderizado:
 *   1. Verifica que el usuario tenga rol 'residente'; si no, muestra acceso denegado.
 *   2. Carga las reservas aprobadas del residente al montar el componente.
 *   3. Al seleccionar una reserva, carga los invitados asociados a esa reserva.
 *   4. Permite agregar/eliminar invitados con validaciones de aforo y duplicados.
 *
 * @returns {JSX.Element} Página completa de gestión de invitados o mensaje de acceso denegado.
 */
const GestionInvitados = () => {
  // Contexto de autenticación: usuario actual y perfil con rol
  const { user, profile } = useAuth();
  // Contexto de UI: funciones para mostrar toast y diálogos de confirmación
  const { showToast, showConfirm } = useUIFeedback();

  // ── Estados locales ──────────────────────────────────────────────────
  /** @type {[Object|null, Function]} Reserva actualmente seleccionada por el residente */
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  /** @type {[string, Function]} Nombre completo del nuevo invitado a registrar */
  const [nombreCompleto, setNombreCompleto] = useState('');
  /** @type {[string, Function]} Número de documento de identidad del nuevo invitado */
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');

  // ── Obtener Reservas del Residente ───────────────────────────────────
  // Se pasa el ID del usuario residente para traer solo sus reservas
  const { reservas, loading: cargandoReservas } = useReservas(user?.id);

  /**
   * Reservas aprobadas y futuras (o vigentes) del residente.
   * Filtra las reservas para mostrar solo las que:
   *   - Tienen estado 'aprobada'
   *   - La fecha del evento es hoy o posterior
   * Se recalcula cuando cambia el array de reservas.
   */
  const reservasAprobadas = useMemo(() => {
    // Asegurar que reservas sea un array (evitar errores si es undefined/null)
    const raw = Array.isArray(reservas) ? reservas : [];
    // Fecha de hoy en formato YYYY-MM-DD para comparar con las fechas de las reservas
    const hoy = new Date().toISOString().split('T')[0];
    // Filtrar: solo reservas aprobadas con fecha futura o vigente
    return raw.filter(r => r.estado === 'aprobada' && r.fecha_evento >= hoy);
  }, [reservas]);

  // ── Hook de Invitados para la Reserva Seleccionada ───────────────────
  // Se pasa el ID de la reserva seleccionada; si es null, el hook no carga datos
  const {
    invitados,          // Array de invitados registrados en la reserva seleccionada
    cargandoInvitados,  // Boolean: true mientras se cargan los invitados
    agregarInvitado,    // Función async para agregar un nuevo invitado
    agregando,          // Boolean: true mientras se está procesando la adición
    eliminarInvitado,   // Función async para eliminar un invitado por su ID
    eliminando          // Boolean: true mientras se está procesando la eliminación
  } = useInvitados(reservaSeleccionada?.id);

  /**
   * Efecto para limpiar los campos del formulario al cambiar de reserva.
   * Evita que queden datos residuales de un formulario anterior.
   */
  useEffect(() => {
    setNombreCompleto('');
    setDocumentoIdentidad('');
  }, [reservaSeleccionada]);

  // ── Cálculo de aforo ─────────────────────────────────────────────────
  /** Capacidad máxima de invitados definida en la reserva */
  const aforoReservado = reservaSeleccionada?.numero_invitados || 0;
  /** Cantidad de invitados actualmente registrados en la lista */
  const aforoRegistrado = invitados?.length || 0;
  /** Cupos disponibles para agregar más invitados (puede ser negativo si se excede) */
  const aforoDisponible = aforoReservado - aforoRegistrado;

  // ────────────────────────────────────────────────────────
  // Handlers (Manejadores de eventos)
  // ────────────────────────────────────────────────────────

  /**
   * Manejador para agregar un nuevo invitado a la reserva seleccionada.
   *
   * Flujo:
   *   1. Previene el comportamiento por defecto del formulario.
   *   2. Valida que ambos campos (nombre y documento) no estén vacíos.
   *   3. Valida que no se haya superado el aforo máximo de la reserva.
   *   4. Valida que el documento no esté duplicado en la lista actual.
   *   5. Llama a agregarInvitado() del hook useInvitados con los datos del formulario.
   *   6. Limpia los campos del formulario y muestra toast de éxito.
   *   7. En caso de error, muestra toast con el mensaje de error.
   *
   * @param {React.FormEvent} e - Evento de envío del formulario.
   * @returns {void}
   */
  const handleAgregarInvitado = async (e) => {
    e.preventDefault();

    // Validación: campos obligatorios
    if (!nombreCompleto.trim() || !documentoIdentidad.trim()) {
      showToast('Todos los campos son obligatorios.', 'warning');
      return;
    }

    // Validación: límite de aforo de la reserva
    if (aforoRegistrado >= aforoReservado) {
      showToast(`Límite superado. Tu reserva solo permite un máximo de ${aforoReservado} invitados.`, 'error');
      return;
    }

    // Validación: documento duplicado en la lista actual
    const yaRegistrado = invitados.some(inv => inv.documento_identidad === documentoIdentidad.trim());
    if (yaRegistrado) {
      showToast('Este número de documento ya está registrado en la lista de invitados.', 'warning');
      return;
    }

    try {
      // Servicio: agregarInvitado del hook useInvitados
      await agregarInvitado({
        nombreCompleto: nombreCompleto.trim(),
        documentoIdentidad: documentoIdentidad.trim()
      });
      // Limpiar formulario después de registro exitoso
      setNombreCompleto('');
      setDocumentoIdentidad('');
      showToast('Invitado registrado correctamente.', 'success');
    } catch (err) {
      showToast(err.message || 'Error al agregar invitado.', 'error');
    }
  };

  /**
   * Manejador para eliminar un invitado de la lista.
   *
   * Flujo:
   *   1. Muestra un diálogo de confirmación (showConfirm) con advertencia de peligro.
   *   2. Si el usuario confirma, llama a eliminarInvitado() del hook useInvitados.
   *   3. Muestra toast de éxito o error según el resultado.
   *
   * Nota: No se permite eliminar invitados que ya hayan ingresado (estado_acceso === 'ingresado').
   *       Esta validación se realiza en el botón de la tabla (disabled).
   *
   * @param {string|number} invitadoId - ID único del invitado a eliminar.
   * @returns {void}
   */
  const handleEliminarInvitado = async (invitadoId) => {
    // Diálogo de confirmación antes de eliminar
    const confirmado = await showConfirm({
      title: '¿Eliminar invitado?',
      message: 'Esta acción removerá al invitado de la lista de acceso. No se puede deshacer.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (!confirmado) return;
    try {
      // Servicio: eliminarInvitado del hook useInvitados
      await eliminarInvitado(invitadoId);
      showToast('Invitado eliminado de la lista.', 'success');
    } catch (err) {
      showToast(err.message || 'Error al eliminar invitado.', 'error');
    }
  };

  // ── Control de acceso por rol ─────────────────────────────────────────
  // Solo los usuarios con rol 'residente' pueden gestionar invitados.
  // Otros roles (admin, portería, etc.) ven un mensaje de acceso denegado.
  if (profile?.rol !== 'residente') {
    return (
      <div style={styles.accesoNegadoContainer}>
        <div style={styles.accesoNegadoCard}>
          <AlertTriangle size={48} color="var(--danger)" />
          <h2>Acceso No Permitido</h2>
          <p>Esta sección es de uso exclusivo para residentes autenticados.</p>
        </div>
      </div>
    );
  }

  // ── Renderizado principal ─────────────────────────────────────────────
  return (
    <div className="fade-in" style={styles.container}>
      
      {/* Cabecera de la página con título y descripción */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.titulo}>Lista de Invitados Digital</h1>
          <p style={styles.subtitulo}>Registra a tus invitados para tus eventos aprobados. Portería controlará el acceso usando esta lista.</p>
        </div>
      </header>

      {/* Layout de dos paneles: izquierda (reservas) / derecha (gestión de invitados) */}
      <div style={styles.layoutGrid}>
        
        {/* Panel izquierdo: Lista de eventos aprobados del residente */}
        <section style={styles.seccionIzquierda}>
          <div style={styles.cardHeader}>
            <Calendar size={18} color="var(--primary)" />
            <h3 style={styles.cardTitle}>Tus Próximos Eventos Aprobados</h3>
          </div>

          {cargandoReservas ? (
            <div style={styles.cargando}>Cargando tus reservas aprobadas...</div>
          ) : reservasAprobadas.length === 0 ? (
            <div style={styles.sinEventos}>
              <Inbox size={36} color="#94A3B8" />
              <p>No tienes reservas activas o aprobadas para los próximos días.</p>
            </div>
          ) : (
            <div style={styles.listaReservas}>
              {reservasAprobadas.map(res => {
                // Determina si esta reserva es la actualmente seleccionada (para estilo activo)
                const esActivo = reservaSeleccionada?.id === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => setReservaSeleccionada(res)}
                    style={{
                      ...styles.reservaCard,
                      ...(esActivo ? styles.reservaCardActivo : {})
                    }}
                  >
                    <div style={styles.reservaInfo}>
                      <span style={styles.reservaTipo}>{res.tipo_evento}</span>
                      <span style={styles.reservaFecha}>
                        {/* Formatear fecha del evento: lunes, 15 ene. Se añade T12:00:00 para evitar problemas de zona horaria */}
                        {new Date(res.fecha_evento + 'T12:00:00').toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      <span style={styles.reservaAforoMax}>
                        Aforo Reservado: {res.numero_invitados} pers.
                      </span>
                    </div>
                    <ArrowRight size={16} color={esActivo ? 'var(--primary)' : '#94A3B8'} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Panel derecho: Gestión de invitados para la reserva seleccionada */}
        <section style={styles.seccionDerecha}>
          {!reservaSeleccionada ? (
            <div style={styles.reservaNoSeleccionada}>
              <Users size={48} color="#CBD5E1" />
              <h3>Selecciona un evento</h3>
              <p>Haz clic en uno de tus eventos aprobados a la izquierda para administrar su lista de invitados digital.</p>
            </div>
          ) : (
            <div style={styles.gestionWrapper}>
              
              {/* Dashboard de aforo: muestra capacidad total, registrados y cupos libres */}
              <div style={styles.aforoDashboard}>
                <div style={styles.aforoCard}>
                  <span style={styles.aforoLabel}>Aforo Total</span>
                  <span style={{ ...styles.aforoNum, color: '#0F172A' }}>{aforoReservado}</span>
                </div>
                <div style={styles.aforoCard}>
                  <span style={styles.aforoLabel}>Registrados</span>
                  <span style={{ ...styles.aforoNum, color: 'var(--primary)' }}>{aforoRegistrado}</span>
                </div>
                <div style={styles.aforoCard}>
                  <span style={styles.aforoLabel}>Cupos Libres</span>
                  <span style={{
                    ...styles.aforoNum,
                    color: aforoDisponible <= 0 ? 'var(--danger)' : 'var(--success)'
                  }}>
                    {aforoDisponible}
                  </span>
                </div>
              </div>

              {/* Formulario de agregar invitado (se oculta si el aforo está completo) */}
              <div style={styles.cajaAccion}>
                <div style={styles.cajaHeader}>
                  <UserPlus size={18} color="var(--primary)" />
                  <h4 style={styles.cajaTitle}>Agregar Invitado</h4>
                </div>

                {aforoDisponible <= 0 ? (
                  <div style={styles.alertaCompleto}>
                    <AlertCircle size={18} />
                    <span>Has alcanzado el límite máximo de aforo reservado ({aforoReservado} personas).</span>
                  </div>
                ) : (
                  <form onSubmit={handleAgregarInvitado} style={styles.formulario}>
                    <div style={styles.formRow}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Nombre Completo *</label>
                        <input
                          type="text"
                          placeholder="Ej: María Camila Restrepo"
                          value={nombreCompleto}
                          onChange={e => setNombreCompleto(e.target.value)}
                          disabled={agregando}
                          style={styles.input}
                          required
                        />
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Documento de Identidad *</label>
                        <input
                          type="text"
                          placeholder="Ej: 1020493821"
                          value={documentoIdentidad}
                          onChange={e => setDocumentoIdentidad(e.target.value)}
                          disabled={agregando}
                          style={styles.input}
                          required
                        />
                      </div>
                    </div>



                    <button
                      type="submit"
                      disabled={agregando}
                      style={{
                        ...styles.btnAgregar,
                        opacity: agregando ? 0.7 : 1,
                        cursor: agregando ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {agregando ? 'Registrando...' : 'Registrar Invitado'}
                    </button>
                  </form>
                )}
              </div>

              {/* Tabla de invitados registrados con estado de acceso y botón de eliminar */}
              <div style={styles.cajaLista}>
                <div style={styles.cajaHeader}>
                  <Users size={18} color="var(--text-muted)" />
                  <h4 style={styles.cajaTitle}>Invitados en la Lista ({aforoRegistrado})</h4>
                </div>

                {cargandoInvitados ? (
                  <div style={styles.cargandoSecundario}>Cargando lista de invitados...</div>
                ) : invitados.length === 0 ? (
                  <div style={styles.sinInvitadosLista}>
                    <Users size={28} color="#94A3B8" />
                    <p>No hay invitados registrados todavía. Comienza a agregarlos arriba.</p>
                  </div>
                ) : (
                  <div style={styles.tablaWrapper}>
                    <table style={styles.tabla}>
                      <thead>
                        <tr style={styles.filaEncabezado}>
                          <th style={styles.celdaEncabezado}>Nombre Completo</th>
                          <th style={styles.celdaEncabezado}>Documento</th>
                          <th style={styles.celdaEncabezado}>Estado Acceso</th>
                          <th style={{ ...styles.celdaEncabezado, textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitados.map(inv => (
                          <tr key={inv.id} style={styles.fila}>
                            <td style={{ ...styles.celda, fontWeight: '600' }}>{inv.nombre_completo}</td>
                            <td style={styles.celda}>{inv.documento_identidad}</td>
                            <td style={styles.celda}>
                              {/* Badge de estado de acceso: 'ingresado' (verde) o 'pendiente' (gris) */}
                              <span style={{
                                ...styles.badgeIngreso,
                                backgroundColor:
                                  inv.estado_acceso === 'ingresado' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                color:
                                  inv.estado_acceso === 'ingresado' ? '#059669' : '#475569'
                              }}>
                                {inv.estado_acceso === 'ingresado' ? 'Ingresado' : 'Pendiente'}
                              </span>
                            </td>
                            <td style={{ ...styles.celda, textAlign: 'center' }}>
                              {/* Botón eliminar: deshabilitado si el invitado ya ingresó o se está eliminando */}
                              <button
                                onClick={() => handleEliminarInvitado(inv.id)}
                                disabled={eliminando || inv.estado_acceso === 'ingresado'}
                                style={{
                                  ...styles.btnEliminar,
                                  opacity: (eliminando || inv.estado_acceso === 'ingresado') ? 0.4 : 1,
                                  cursor: (eliminando || inv.estado_acceso === 'ingresado') ? 'not-allowed' : 'pointer'
                                }}
                                title={inv.estado_acceso === 'ingresado' ? 'No se puede eliminar un invitado que ya ingresó' : 'Eliminar invitado'}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </section>

      </div>
    </div>
  );
};

/**
 * Estilos en línea del componente GestionInvitados.
 * Sigue las directrices de diseño de frontend-design para mantener
 * consistencia visual con el resto de la aplicación.
 */
const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '2rem'
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
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '2rem',
    alignItems: 'start'
  },
  seccionIzquierda: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '0.75rem',
    marginBottom: '1rem'
  },
  cardTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#0F172A',
    margin: 0
  },
  cargando: {
    padding: '2rem 0',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#64748B',
    fontStyle: 'italic'
  },
  sinEventos: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '3rem 1rem',
    gap: '0.5rem',
    color: '#64748B',
    fontSize: '0.825rem'
  },
  listaReservas: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  reservaCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#F8FAFC',
    ':hover': {
      backgroundColor: '#F1F5F9',
      borderColor: '#CBD5E1'
    }
  },
  reservaCardActivo: {
    borderColor: 'var(--primary)',
    backgroundColor: 'var(--primary-light)',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.05)'
  },
  reservaInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  reservaTipo: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#0F172A'
  },
  reservaFecha: {
    fontSize: '0.8rem',
    color: '#475569',
    fontWeight: '500'
  },
  reservaAforoMax: {
    fontSize: '0.75rem',
    color: '#64748B',
    marginTop: '2px'
  },
  seccionDerecha: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    minHeight: '420px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  reservaNoSeleccionada: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '4rem 2rem',
    textAlign: 'center',
    color: '#64748B',
    gap: '0.75rem',
    maxWidth: '480px',
    margin: '0 auto'
  },
  gestionWrapper: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  aforoDashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem'
  },
  aforoCard: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  aforoLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  aforoNum: {
    fontSize: '1.5rem',
    fontWeight: '800'
  },
  cajaAccion: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '1.25rem'
  },
  cajaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '0.5rem',
    marginBottom: '1rem'
  },
  cajaTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#334155',
    margin: 0
  },
  alertaCompleto: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--danger)',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  formulario: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#475569'
  },
  input: {
    height: '40px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '0 0.75rem',
    fontSize: '0.875rem',
    color: '#0F172A',
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: 'var(--primary)'
    }
  },
  btnAgregar: {
    height: '40px',
    backgroundColor: 'var(--primary)',
    color: '#FFFFFF',
    fontWeight: '600',
    borderRadius: '8px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      backgroundColor: 'var(--primary-hover)'
    }
  },
  mensajeError: {
    color: 'var(--danger)',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  mensajeExito: {
    color: 'var(--success)',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  cajaLista: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '1.25rem',
    overflow: 'hidden'
  },
  cargandoSecundario: {
    padding: '2rem 0',
    textAlign: 'center',
    fontSize: '0.825rem',
    color: '#64748B',
    fontStyle: 'italic'
  },
  sinInvitadosLista: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '2.5rem 1rem',
    color: '#64748B',
    fontSize: '0.825rem',
    gap: '6px'
  },
  tablaWrapper: {
    overflowX: 'auto',
    marginTop: '0.5rem'
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
    padding: '0.75rem 1rem',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  fila: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#F8FAFC'
    }
  },
  celda: {
    padding: '1rem',
    fontSize: '0.825rem',
    color: '#334155'
  },
  badgeIngreso: {
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  btnEliminar: {
    backgroundColor: 'transparent',
    color: '#94A3B8',
    padding: '6px',
    borderRadius: '6px',
    transition: 'all 0.2s',
    border: 'none',
    cursor: 'pointer',
    ':hover': {
      color: 'var(--danger)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)'
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

// Exportación por defecto del componente principal
export default GestionInvitados;
