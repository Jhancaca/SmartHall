/**
 * @file AprobacionReservas.jsx
 * @description Página exclusiva del panel de administración para aprobar o rechazar
 * solicitudes de reserva del salón social de un edificio/residencial.
 *
 * Funcionalidades principales:
 *  - Visualización de KPIs en tiempo real (pendientes, aprobadas, rechazadas del mes).
 *  - Tab de "Pendientes" con tabla interactiva (TanStack React Table) que permite
 *    ordenar por fecha de evento y filtrar por nombre de residente, número de apartamento
 *    o tipo de evento.
 *  - Indicador visual de "Semáforo de Prioridad" que clasifica las reservas según
 *    la cercanía de su fecha de evento:
 *      - Rojo (pulso animado): evento dentro de 72 horas.
 *      - Amarillo: evento dentro de 7 días.
 *      - Verde: evento a más de 7 días.
 *      - Gris: evento ya vencido.
 *  - Tab de "Historial" con reservas aprobadas/rechazadas y filtros por rango de fechas.
 *  - Modal de detalle completo de la reserva con información del residente.
 *  - Modal de rechazo con campo obligatorio de motivo.
 *
 * Hooks y contextos utilizados:
 *  - useReservas: obtener, aprobar y rechazar reservas desde Supabase.
 *  - useAuth: obtener el perfil y usuario autenticado.
 *  - useUIFeedback: mostrar notificaciones toast al usuario.
 *
 * Componentes externos utilizados:
 *  - @tanstack/react-table: tabla interactiva con ordenamiento.
 *  - lucide-react: iconografía (CheckCircle, XCircle, Eye, AlertTriangle, etc.).
 *  - EstadoBadge: badge de estado visual para cada reserva.
 *  - Modal: componente reutilizable de ventana modal.
 *
 * Control de acceso:
 *  - Solo los usuarios con rol 'administrador' o 'supervisor' pueden ver este panel.
 *  - Si el usuario no tiene los permisos necesarios, se muestra una pantalla de acceso denegado.
 */

import { useState, useMemo, useEffect } from 'react';
import { useReservas } from '../hooks/useReservas';
import { useAuth } from '../context/AuthContext';
import EstadoBadge from '../components/ui/EstadoBadge';
import Modal from '../components/ui/Modal';
import { useUIFeedback } from '../context/UIFeedbackContext';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender
} from '@tanstack/react-table';
import {
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowUpDown,
  Search,
  Check,
  X
} from 'lucide-react';

/**
 * @description Componente principal del panel de aprobación de reservas.
 * Renderiza KPIs, tabs de pendientes/historial, tablas interactivas, modales de
 * detalle y rechazo, y controles de filtrado y ordenamiento.
 * @returns {JSX.Element} Panel completo de administración de reservas o pantalla
 * de acceso denegado si el usuario no tiene permisos.
 */
const AprobacionReservas = () => {
  // Contexto de autenticación: obtiene el perfil del usuario y el objeto user de Supabase
  const { profile, user } = useAuth();
  // Función para mostrar notificaciones toast al usuario
  const { showToast } = useUIFeedback();

  /**
   * Hooks del dominio de reservas:
   *  - reservas: array completo de reservas del sistema
   *  - loading: boolean que indica si se están cargando datos
   *  - fetchReservas: recarga todas las reservas desde la base de datos
   *  - aprobarReserva: cambia el estado de una reserva a 'aprobada'
   *  - rechazarReserva: cambia el estado a 'rechaza' con un motivo
   *  - obtenerReservasPendientes: retorna el conteo de reservas pendientes
   *  - obtenerReservasEsteMes: retorna el conteo de reservas aprobadas del mes actual
   */
  const {
    reservas,
    loading,
    fetchReservas,
    aprobarReserva,
    rechazarReserva,
    obtenerReservasPendientes,
    obtenerReservasEsteMes
  } = useReservas();

  // --- Estado de KPIs (indicadores clave de rendimiento) ---
  /** @type {[number, function]} Número de reservas pendientes de revisión */
  const [kpiPendientes, setKpiPendientes] = useState(0);
  /** @type {[number, function]} Número de reservas aprobadas en el mes actual */
  const [kpiAprobadas, setKpiAprobadas] = useState(0);
  /** @type {[number, function]} Número de reservas rechazadas en el mes actual */
  const [kpiRechazadas, setKpiRechazadas] = useState(0);

  // --- Estados de navegación y filtros ---
  /** @type {[string, function]} Tab activo actualmente: 'pendientes' o 'historial' */
  const [tabActual, setTabActual] = useState('pendientes');
  /** @type {[string, function]} Texto de búsqueda para filtrar por nombre, apto o tipo de evento */
  const [filtroTexto, setFiltroTexto] = useState('');
  /** @type {[string, function]} Fecha límite inferior para filtrar historial */
  const [fechaDesde, setFechaDesde] = useState('');
  /** @type {[string, function]} Fecha límite superior para filtrar historial */
  const [fechaHasta, setFechaHasta] = useState('');

  // --- Estado de ordenamiento de TanStack Table ---
  /** Configuración de sorting: ordena por 'fecha_evento' de forma ascendente por defecto */
  const [sorting, setSorting] = useState([{ id: 'fecha_evento', desc: false }]);

  // --- Estado de modales y formularios ---
  /** @type {[Object|null, function]} Reserva seleccionada para ver en el modal de detalle */
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  /** @type {[boolean, function]} Controla la apertura del modal de detalle de reserva */
  const [isModalDetalleAbierto, setIsModalDetalleAbierto] = useState(false);
  /** @type {[Object|null, function]} Reserva que se está rechazando actualmente */
  const [reservaRechazar, setReservaRechazar] = useState(null);
  /** @type {[string, function]} Texto del motivo de rechazo ingresado por el admin */
  const [motivoRechazo, setMotivoRechazo] = useState('');
  /** @type {[boolean, function]} Controla la apertura del modal de rechazo */
  const [isModalRechazoAbierto, setIsModalRechazoAbierto] = useState(false);
  /** @type {[boolean, function]} Indica si una operación de aprobación/rechazo está en curso (deshabilita botones) */
  const [procesando, setProcesando] = useState(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  /**
   * @description Carga inicial de datos: obtiene todas las reservas y calcula los
   * valores de los KPIs (pendientes, aprobadas del mes, rechazadas del mes).
   * Se ejecuta al montar el componente y después de cada aprobación/rechazo exitoso.
   * @async
   * @returns {Promise<void>}
   */
  const cargarDatos = async () => {
    // Obtener todas las reservas de la base de datos
    await fetchReservas();

    // Obtener conteos para los KPIs mediante el hook de reservas
    const pendientes = await obtenerReservasPendientes();
    const aprobadas = await obtenerReservasEsteMes();

    setKpiPendientes(pendientes);
    setKpiAprobadas(aprobadas);

    // --- Cálculo de reservas rechazadas en el mes actual ---
    // Se calcula el rango del mes actual (primer día hasta el último día)
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

    // Filtrar reservas rechazadas cuya fecha de revisión caiga dentro del mes actual
    const rechazadasEsteMes = (Array.isArray(reservas) ? reservas : []).filter(r =>
      r.estado === 'rechazada' &&
      r.fecha_revision &&
      new Date(r.fecha_revision) >= primerDia &&
      new Date(r.fecha_revision) <= ultimoDia
    ).length;

    setKpiRechazadas(rechazadasEsteMes);
  };

  // ============================================================================
  // SEMÁFORO DE PRIORIDAD
  // ============================================================================
  // Función que determina la urgencia de una reserva según la cercanía de su
  // fecha de evento respecto a la fecha actual. Devuelve un objeto con:
  //   - nivel: identificador del estado ('vencida', 'rojo', 'amarillo', 'verde')
  //   - color: código hexadecimal para el indicador visual
  //   - label: texto descriptivo para mostrar al usuario
  //
  // Lógica de clasificación:
  //   - Si el evento ya pasó (días < 0)     → nivel 'vencida' (gris, sin animación)
  //   - Si faltan 3 días o menos (≤72h)     → nivel 'rojo'   (pulso animado, alta urgencia)
  //   - Si faltan entre 4 y 7 días          → nivel 'amarillo' (atención, proximidad)
  //   - Si faltan más de 7 días             → nivel 'verde'   (sin urgencia)
  //
  // Nota: Se fuerza la hora a mediodía (T12:00:00) para evitar problemas
  // con zonas horarias que puedan afectar el cálculo de días restantes.
  // ============================================================================
  /**
   * @description Calcula la prioridad visual (semáforo) de una reserva según
   * la fecha de su evento comparada con la fecha actual.
   * @param {string} fechaEvento - Fecha del evento en formato 'YYYY-MM-DD'
   * @returns {{ nivel: string, color: string, label: string }} Objeto con el
   * nivel de prioridad, color hexadecimal y etiqueta descriptiva.
   */
  const calcularPrioridadSemáforo = (fechaEvento) => {
    const ahora = new Date();
    // Se agrega T12:00:00 para evitar desfases por zona horaria
    const fecha = new Date(fechaEvento + 'T12:00:00');
    // Calcular la diferencia en milisegundos y convertirla a días
    const diferenciaMs = fecha - ahora;
    const diasFaltantes = diferenciaMs / (1000 * 60 * 60 * 24);

    // Evento ya vencido: el día ya pasó
    if (diasFaltantes < 0) return { nivel: 'vencida', color: '#64748B', label: 'Realizado/Vencido' };
    // Urgencia alta: faltan 72 horas o menos (3 días)
    if (diasFaltantes <= 3) return { nivel: 'rojo', color: '#EF4444', label: 'Urgente (<72h)' };
    // Atención media: faltan entre 4 y 7 días
    if (diasFaltantes <= 7) return { nivel: 'amarillo', color: '#F59E0B', label: 'Próximo (<7d)' };
    // Sin urgencia: más de 7 días para el evento
    return { nivel: 'verde', color: '#10B981', label: 'Normal (>7d)' };
  };

  // ============================================================================
  // FILTRADO DE RESERVAS (useMemo)
  // ============================================================================

  /**
   * Reservas pendientes sin aplicar filtros de texto.
   * Se extraen únicamente las reservas con estado 'pendiente' del array completo.
   * @type {Array}
   */
  const reservasPendientesRaw = useMemo(() => {
    return reservas.filter(r => r.estado === 'pendiente');
  }, [reservas]);

  /**
   * Reservas pendientes filtradas por el texto de búsqueda.
   * Busca coincidencias en el nombre completo del residente, número de apartamento
   * o tipo de evento. La búsqueda es case-insensitive.
   * @type {Array}
   */
  const reservasPendientesFiltradas = useMemo(() => {
    if (!filtroTexto.trim()) return reservasPendientesRaw;
    const query = filtroTexto.toLowerCase();
    return reservasPendientesRaw.filter(r => {
      const nombre = `${r.usuarios?.nombres || ''} ${r.usuarios?.apellidos || ''}`.toLowerCase();
    const apto = (r.usuarios?.numero_apto || '').toLowerCase();
      const tipo = (r.tipo_evento || '').toLowerCase();
      return nombre.includes(query) || apto.includes(query) || tipo.includes(query);
    });
  }, [reservasPendientesRaw, filtroTexto]);

  /**
   * Historial de reservas aprobadas y rechazadas con filtros aplicados.
   * Excluye reservas pendientes y canceladas. Aplica filtros de:
   *  - Rango de fechas (fechaDesde / fechaHasta) sobre la fecha del evento.
   *  - Texto de búsqueda (nombre, apartamento o tipo de evento).
   * @type {Array}
   */
  const historialFiltrado = useMemo(() => {
    return reservas.filter(r => {
      // Excluir pendientes y canceladas del historial
      if (r.estado === 'pendiente' || r.estado === 'cancelada') return false;

      // Filtro de fecha desde: excluir eventos anteriores a la fecha indicada
      if (fechaDesde && new Date(r.fecha_evento) < new Date(fechaDesde)) return false;
      // Filtro de fecha hasta: excluir eventos posteriores a la fecha indicada
      if (fechaHasta && new Date(r.fecha_evento) > new Date(fechaHasta)) return false;

      // Filtro por texto de búsqueda (mismo criterio que pendientes)
      if (filtroTexto.trim()) {
        const query = filtroTexto.toLowerCase();
        const nombre = `${r.usuarios?.nombres} ${r.usuarios?.apellidos}`.toLowerCase();
        const apto = (r.usuarios?.numero_apto || '').toLowerCase();
        const tipo = (r.tipo_evento || '').toLowerCase();
        return nombre.includes(query) || apto.includes(query) || tipo.includes(query);
      }

      return true;
    });
  }, [reservas, fechaDesde, fechaHasta, filtroTexto]);

  // ============================================================================
  // DEFINICIÓN DE COLUMNAS - TANSTACK REACT TABLE (Pendientes)
  // ============================================================================
  // Cada columna define: accessor (clave de datos), header (encabezado) y cell (renderizado).
  // La columna de acciones contiene los botones de detalle, aprobación y rechazo.
  /**
   * @description Arreglo de definiciones de columnas para la tabla de reservas pendientes.
   * Incluye: residente/apartamento, fecha del evento, horario, tipo de evento,
   * número de invitados, indicador de prioridad (semáforo) y acciones (ver, aprobar, rechazar).
   * @type {Array}
   */
  const columnasPendientes = useMemo(() => [
    {
      // Columna de residente: muestra avatar con iniciales, nombre completo y apartamento
      id: 'residente',
      header: 'Residente / Apto',
      accessorFn: row => `${row.usuarios?.nombres} ${row.usuarios?.apellidos}`,
      cell: info => {
        const row = info.row.original;
        const nombres = row.usuarios?.nombres || '';
        const apellidos = row.usuarios?.apellidos || '';
        return (
          <div style={styles.residenteCelda}>
            <div style={styles.avatar}>
              {nombres?.charAt(0) || apellidos?.charAt(0)}{apellidos?.charAt(0) || ''}
            </div>
            <div>
              <div style={styles.nombre}>{nombres} {apellidos}</div>
              <div style={styles.apto}>Apto {row.usuarios?.numero_apto || 'N/A'}</div>
            </div>
          </div>
        );
      }
    },
    {
      // Columna de fecha del evento: soporta ordenamiento ascendente/descendente
      accessorKey: 'fecha_evento',
      header: ({ column }) => (
        <button style={styles.btnEncabezadoSort} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Fecha Evento <ArrowUpDown size={14} />
        </button>
      ),
      cell: info => {
        const fecha = info.getValue();
        return (
          <span style={{ fontWeight: '600' }}>
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        );
      }
    },
    {
      // Columna de horario: muestra hora de inicio y fin en un badge
      id: 'horario',
      header: 'Horario',
      cell: info => {
        const row = info.row.original;
        return <span style={styles.horarioBadge}>{row.hora_inicio} - {row.hora_fin}</span>;
      }
    },
    {
      // Columna de tipo de evento: valor directo del campo tipo_evento
      accessorKey: 'tipo_evento',
      header: 'Tipo Evento',
    },
    {
      // Columna de número de invitados: resaltado en negrita
      accessorKey: 'numero_invitados',
      header: 'Invitados',
      cell: info => <span style={{ fontWeight: '700' }}>{info.getValue()}</span>
    },
    {
      // Columna de prioridad (semáforo): renderiza el indicador visual con color y label
      id: 'semaforo',
      header: 'Prioridad',
      cell: info => {
        const row = info.row.original;
        const semaforo = calcularPrioridadSemáforo(row.fecha_evento);
        const esUrgente = semaforo.nivel === 'rojo';

        return (
          <div style={styles.semaforoContenedor}>
            <span style={{
              ...styles.semaforoIndicador,
              backgroundColor: semaforo.color,
              // Animación de pulso solo para reservas urgentes (rojo)
              animation: esUrgente ? 'pulse-glow 1.5s infinite' : 'none'
            }} />
            <span style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: esUrgente ? '#EF4444' : 'inherit'
            }}>
              {semaforo.label}
            </span>
          </div>
        );
      }
    },
    {
      // Columna de acciones: botones de ver detalle, aprobar y rechazar reserva
      id: 'acciones',
      header: 'Acciones',
      cell: info => {
        const row = info.row.original;
        return (
          <div style={styles.acciones}>
            <button
              onClick={() => {
                // Abrir modal de detalle con la reserva seleccionada
                setReservaSeleccionada(row);
                setIsModalDetalleAbierto(true);
              }}
              style={styles.btnAccionDetalle}
              title="Ver detalle"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={() => handleAprobación(row.id)}
              disabled={procesando}
              style={styles.btnAccionAprobar}
              title="Aprobar"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => handleRechazo(row)}
              disabled={procesando}
              style={styles.btnAccionRechazar}
              title="Rechazar"
            >
              <X size={18} />
            </button>
          </div>
        );
      }
    }
  ], [procesando]);

  // ============================================================================
  // INSTANCIA DE TANSTACK REACT TABLE
  // ============================================================================
  // Configura la tabla de pendientes con:
  //  - data: reservas pendientes filtradas
  //  - columns: definiciones de columnas
  //  - sorting: estado de ordenamiento controlado externamente
  //  - getCoreRowModel / getSortedRowModel: modelos de fila para renderizado y ordenamiento
  /**
   * @description Instancia de TanStack React Table configurada para la pestaña de pendientes.
   */
  const tablePendientes = useReactTable({
    data: reservasPendientesFiltradas,
    columns: columnasPendientes,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  // ============================================================================
  // HANDLERS (MANEJADORES DE EVENTOS)
  // ============================================================================

  /**
   * @description Aprueba una reserva pendiente. Llama a aprobarReserva del hook
   * useReservas con el ID de la reserva y el ID del usuario administrador.
   * Muestra un toast de éxito o error, y recarga los datos actualizados.
   * @async
   * @param {string} reservaId - ID único de la reserva a aprobar
   * @returns {Promise<void>}
   */
  const handleAprobación = async (reservaId) => {
    setProcesando(true);
    try {
      const resultado = await aprobarReserva(reservaId, user.id);
      if (resultado.success) {
        showToast('Reserva aprobada correctamente.', 'success');
        await cargarDatos();
      } else {
        showToast('Error al aprobar: ' + resultado.error, 'error');
      }
    } finally {
      setProcesando(false);
    }
  };

  /**
   * @description Abre el modal de rechazo para una reserva específica.
   * Guarda la reserva seleccionada, limpia el motivo anterior y abre el modal.
   * @param {Object} reserva - Objeto completo de la reserva a rechazar
   * @returns {void}
   */
  const handleRechazo = (reserva) => {
    setReservaRechazar(reserva);
    setMotivoRechazo('');
    setIsModalRechazoAbierto(true);
  };

  /**
   * @description Confirma el rechazo de una reserva. Valida que el motivo no esté
   * vacío (es obligatorio), llama a rechazarReserva del hook useReservas con el
   * ID de la reserva, ID del administrador y el motivo. Cierra el modal,
   * muestra toast de éxito/error y recarga los datos.
   * @async
   * @returns {Promise<void>}
   */
  const confirmarRechazo = async () => {
    // Validar que el motivo de rechazo no esté vacío
    if (!motivoRechazo.trim()) {
      showToast('El motivo de rechazo es obligatorio.', 'warning');
      return;
    }

    setProcesando(true);
    try {
      const resultado = await rechazarReserva(reservaRechazar.id, user.id, motivoRechazo);
      if (resultado.success) {
        showToast('Reserva rechazada correctamente.', 'success');
        await cargarDatos();
        // Limpiar estado del modal y cerrarlo
        setIsModalRechazoAbierto(false);
        setReservaRechazar(null);
        setMotivoRechazo('');
      } else {
        showToast('Error al rechazar: ' + resultado.error, 'error');
      }
    } finally {
      setProcesando(false);
    }
  };

  // ============================================================================
  // CONTROL DE ACCESO POR ROL
  // ============================================================================
  // Si el usuario autenticado no es administrador ni supervisor, se muestra
  // una pantalla de acceso denegado en lugar del panel completo.
  if (!['administrador', 'supervisor'].includes(profile?.rol)) {
    return (
      <div style={styles.container}>
        <div style={styles.accesoNegado}>
          <AlertTriangle size={48} color="#EF4444" />
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a este panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.container}>
      {/* ============================================================================
          ANIMACIÓN CSS - PULSO DEL SEMÁFORO
          ============================================================================
          Estilo inyectado para la animación 'pulse-glow' que se aplica al indicador
          de prioridad cuando el nivel es 'rojo' (evento dentro de 72 horas).
          La animación alterna entre un brillo con sombra y un leve cambio de escala
          para captar la atención del administrador. */}
      <style>{`
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            transform: scale(0.95);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
            transform: scale(1.1);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            transform: scale(0.95);
          }
        }
      `}</style>

      {/* ENCABEZADO DEL PANEL */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titulo}>Panel de Aprobaciones</h1>
          <p style={styles.subtitulo}>Revisa y toma decisiones sobre solicitudes de reserva del salón social.</p>
        </div>
      </div>

      {/* ============================================================================
          KPIs (INDICADORES CLAVE DE RENDIMIENTO)
          ============================================================================
          Muestra tres tarjetas con métricas en tiempo real:
          - Pendientes: reservas que esperan revisión del administrador.
          - Aprobadas: reservas aprobadas en el mes actual.
          - Rechazadas: reservas rechazadas en el mes actual. */}
      <div style={styles.kpisContenedor}>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcono, backgroundColor: '#FEF3C7' }}>
            <Clock size={24} color="#D97706" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Pendientes</p>
            <p style={styles.kpiValor}>{kpiPendientes}</p>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcono, backgroundColor: '#D1FAE5' }}>
            <CheckCircle size={24} color="#059669" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Aprobadas (Este mes)</p>
            <p style={styles.kpiValor}>{kpiAprobadas}</p>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcono, backgroundColor: '#FEE2E2' }}>
            <XCircle size={24} color="#DC2626" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Rechazadas (Este mes)</p>
            <p style={styles.kpiValor}>{kpiRechazadas}</p>
          </div>
        </div>
      </div>

      {/* ============================================================================
          BARRA DE FILTROS Y NAVEGACIÓN POR TABS
          ============================================================================
          Contiene:
          - Tabs para alternar entre "Pendientes" (reservas por revisar) e "Historial"
            (reservas aprobadas/rechazadas).
          - Campo de búsqueda en tiempo real que filtra por nombre, apartamento o tipo. */}
      <div style={styles.barraAcciones}>
        <div style={styles.tabs}>
          <button
            onClick={() => setTabActual('pendientes')}
            style={{
              ...styles.tab,
              borderBottom: tabActual === 'pendientes' ? '3px solid #2563EB' : '3px solid transparent',
              color: tabActual === 'pendientes' ? '#2563EB' : '#64748B'
            }}
          >
            Pendientes ({reservasPendientesFiltradas.length})
          </button>
          <button
            onClick={() => setTabActual('historial')}
            style={{
              ...styles.tab,
              borderBottom: tabActual === 'historial' ? '3px solid #2563EB' : '3px solid transparent',
              color: tabActual === 'historial' ? '#2563EB' : '#64748B'
            }}
          >
            Historial
          </button>
        </div>

        <div style={styles.buscador}>
          <Search size={18} color="#64748B" />
          <input
            type="text"
            placeholder="Buscar por residente o apto..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={styles.buscadorInput}
          />
        </div>
      </div>

      {/* ============================================================================
          CONTENIDO DEL TAB: PENDIENTES
          ============================================================================
          Muestra la tabla de reservas pendientes de revisión usando TanStack Table.
          Estados:
          - Cargando: indicador de carga.
          - Sin resultados: mensaje amigable cuando no hay pendientes.
          - Con datos: tabla con columnas ordenables (fecha) y acciones (ver/aprobar/rechazar). */}
      {tabActual === 'pendientes' && (
        <div style={styles.cajaContenido}>
          {loading ? (
            <div style={styles.cargando}>Cargando reservas...</div>
          ) : reservasPendientesFiltradas.length === 0 ? (
            <div style={styles.sinResultados}>
              <CheckCircle size={48} color="#10B981" />
              <p>No se encontraron reservas pendientes de revisión</p>
            </div>
          ) : (
            <div style={styles.tablaContenedor}>
              <table style={styles.tabla}>
                <thead>
                  {tablePendientes.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} style={styles.filaEncabezado}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} style={styles.celdaEncabezado}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {tablePendientes.getRowModel().rows.map(row => (
                    <tr key={row.id} style={styles.fila}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={styles.celda}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          CONTENIDO DEL TAB: HISTORIAL
          ============================================================================
          Muestra reservas ya aprobadas o rechazadas con filtros por rango de fechas.
          Cada fila incluye: residente, fecha del evento, decisión (badge), revisor,
          fecha de decisión y motivo de rechazo (si aplica). */}
      {tabActual === 'historial' && (
        <div style={styles.cajaContenido}>
          {/* Filtros de Historial: rango de fechas para acotar la búsqueda */}
          <div style={styles.filtrosHistorial}>
            <div>
              <label style={styles.labelFiltro}>Filtrar desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={styles.inputFiltro}
              />
            </div>
            <div>
              <label style={styles.labelFiltro}>Filtrar hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={styles.inputFiltro}
              />
            </div>
          </div>

          {loading ? (
            <div style={styles.cargando}>Cargando historial...</div>
          ) : historialFiltrado.length === 0 ? (
            <div style={styles.sinResultados}>
              <TrendingUp size={48} color="#CBD5E1" />
              <p>No hay historial de decisiones en este rango de fechas</p>
            </div>
          ) : (
            <div style={styles.tablaContenedor}>
              <table style={styles.tabla}>
                <thead>
                  <tr style={styles.filaEncabezado}>
                    <th style={styles.celdaEncabezado}>Residente / Apto</th>
                    <th style={styles.celdaEncabezado}>Fecha Evento</th>
                    <th style={styles.celdaEncabezado}>Decisión</th>
                    <th style={styles.celdaEncabezado}>Revisor</th>
                    <th style={styles.celdaEncabezado}>Fecha Decisión</th>
                    <th style={styles.celdaEncabezado}>Detalle / Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {historialFiltrado.map(reserva => (
                    <tr key={reserva.id} style={styles.fila}>
                      <td style={styles.celda}>
                        <div style={styles.residenteCelda}>
                          <div style={{ ...styles.avatar, backgroundColor: '#F1F5F9', color: '#64748B' }}>
                            {reserva.usuarios?.nombres?.charAt(0)}{reserva.usuarios?.apellidos?.charAt(0)}
                          </div>
                          <div>
                            <p style={styles.nombreResidente}>
                              {reserva.usuarios?.nombres} {reserva.usuarios?.apellidos}
                            </p>
                            <p style={styles.apto}>Apartamento {reserva.usuarios?.numero_apto}</p>
                          </div>
                        </div>
                      </td>
                      <td style={styles.celda}>
                        <span style={{ fontWeight: '600' }}>
                          {new Date(reserva.fecha_evento + 'T12:00:00').toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      <td style={styles.celda}>
                        <EstadoBadge estado={reserva.estado} />
                      </td>
                      <td style={styles.celda}>
                        {reserva.revisado_por_user?.nombres || 'Sistema'}
                      </td>
                      <td style={styles.celda}>
                        {reserva.fecha_revision
                          ? new Date(reserva.fecha_revision).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td style={styles.celda}>
                        {reserva.motivo_rechazo ? (
                          <span style={styles.motivoRechazo}>{reserva.motivo_rechazo}</span>
                        ) : (
                          <span style={{ color: '#64748B', fontStyle: 'italic' }}>Sin observaciones</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          MODAL DE DETALLE DE RESERVA
          ============================================================================
          Se abre al hacer clic en el botón "Ver detalle" (ícono Eye) de una reserva.
          Muestra información completa del residente y del evento:
          nombre, apartamento, correo, teléfono, fecha, horario, tipo e invitados.
          También muestra notas/descripción si la reserva las incluye. */}
      {isModalDetalleAbierto && reservaSeleccionada && (
        <Modal isOpen={isModalDetalleAbierto} onClose={() => setIsModalDetalleAbierto(false)}>
          <div style={styles.modalContenido}>
            <h2 style={styles.modalTitulo}>Detalle Completo de la Reserva</h2>

            {/* Grid de detalles del residente y del evento */}
            <div style={styles.detalleGrid}>
              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Residente:</span>
                <span style={styles.detalleValor}>
                  {reservaSeleccionada.usuarios?.nombres} {reservaSeleccionada.usuarios?.apellidos}
                </span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Apartamento:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.numero_apto || 'N/A'}</span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Correo Electrónico:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.email}</span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Teléfono:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.usuarios?.telefono || 'No registrado'}</span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Fecha del Evento:</span>
                <span style={styles.detalleValor}>
                  {new Date(reservaSeleccionada.fecha_evento + 'T12:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Hora del Evento:</span>
                <span style={styles.detalleValor}>
                  {reservaSeleccionada.hora_inicio} - {reservaSeleccionada.hora_fin}
                </span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Tipo de Evento:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.tipo_evento}</span>
              </div>

              <div style={styles.detalleItem}>
                <span style={styles.detalleLabel}>Cantidad de Invitados:</span>
                <span style={styles.detalleValor}>{reservaSeleccionada.numero_invitados} personas</span>
              </div>

              {/* Notas/descripción: se muestra solo si la reserva tiene descripción */}
              {reservaSeleccionada.descripcion && (
                <div style={{ ...styles.detalleItem, gridColumn: 'span 2' }}>
                  <span style={styles.detalleLabel}>Notas / Descripción:</span>
                  <span style={styles.detalleValor}>{reservaSeleccionada.descripcion}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsModalDetalleAbierto(false)}
              style={styles.btnCerrarModal}
            >
              Cerrar Vista
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================================
          MODAL DE RECHAZO DE RESERVA
          ============================================================================
          Se abre al hacer clic en el botón "Rechazar" de una reserva pendiente.
          Requiere que el administrador ingrese un motivo obligatorio antes de confirmar.
          El motivo será visible para el residente como retroalimentación. */}
      {isModalRechazoAbierto && reservaRechazar && (
        <Modal isOpen={isModalRechazoAbierto} onClose={() => setIsModalRechazoAbierto(false)}>
          <div style={styles.modalContenido}>
            <h2 style={styles.modalTitulo}>Rechazar Solicitud de Reserva</h2>
            <p style={styles.modalDescripcion}>
              Indique los motivos para rechazar la reserva de <strong>{reservaRechazar.usuarios?.nombres}</strong> del{' '}
              <strong>{new Date(reservaRechazar.fecha_evento + 'T12:00:00').toLocaleDateString()}</strong>.
            </p>

            {/* Campo de texto para el motivo de rechazo (obligatorio) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={styles.labelFiltro}>Motivo del Rechazo *</label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Indique el motivo claramente. El residente podrá ver esta observación..."
                style={styles.textarea}
              />
            </div>

            {/* Botones de acción: cancelar o confirmar rechazo */}
            <div style={styles.botonesModal}>
              <button
                onClick={() => setIsModalRechazoAbierto(false)}
                style={styles.btnModalCancelar}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRechazo}
                disabled={procesando || !motivoRechazo.trim()}
                style={{
                  ...styles.btnModalConfirmar,
                  opacity: procesando || !motivoRechazo.trim() ? 0.6 : 1,
                  cursor: procesando || !motivoRechazo.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {procesando ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/**
 * @description Objeto de estilos CSS en línea (inline styles) para todos los
 * elementos visuales del componente. Incluye estilos para: contenedor, encabezado,
 * KPIs, tabs, barra de búsqueda, tablas, modales, botones de acción, semáforo
 * de prioridad, formularios y estados vacíos. Organizado por secciones para
 * facilitar la mantenibilidad.
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
    color: '#1E293B',
    margin: 0
  },
  subtitulo: {
    fontSize: '0.95rem',
    color: '#64748B',
    margin: '0.5rem 0 0 0'
  },
  accesoNegado: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6rem 2rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '1rem',
    border: '1px solid #E2E8F0',
    textAlign: 'center',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
  },
  kpisContenedor: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  kpiCard: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '1rem',
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
  },
  kpiIcono: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0
  },
  kpiValor: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1E293B',
    margin: 0
  },
  barraAcciones: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #E2E8F0',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  tabs: {
    display: 'flex',
    gap: '1.5rem'
  },
  tab: {
    padding: '1rem 0.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.2s'
  },
  buscador: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '0.75rem',
    padding: '0.5rem 1rem',
    width: '320px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  },
  buscadorInput: {
    border: 'none',
    outline: 'none',
    fontSize: '0.875rem',
    width: '100%',
    fontFamily: 'inherit'
  },
  cajaContenido: {
    backgroundColor: '#FFFFFF',
    borderRadius: '1rem',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)'
  },
  cargando: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748B',
    fontWeight: '600'
  },
  sinResultados: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: '#64748B',
    gap: '1rem'
  },
  filtrosHistorial: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap'
  },
  labelFiltro: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1E293B',
    display: 'block',
    marginBottom: '0.5rem'
  },
  inputFiltro: {
    padding: '0.625rem',
    borderRadius: '0.5rem',
    border: '1px solid #E2E8F0',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    backgroundColor: '#F8FAFC'
  },
  tablaContenedor: {
    overflowX: 'auto'
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  filaEncabezado: {
    backgroundColor: '#F8FAFC'
  },
  celdaEncabezado: {
    padding: '1rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #E2E8F0'
  },
  btnEncabezadoSort: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    color: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  fila: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#F8FAFC'
    }
  },
  celda: {
    padding: '1.25rem 1rem',
    fontSize: '0.875rem',
    color: '#1E293B',
    verticalAlign: 'middle'
  },
  residenteCelda: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: '#EFF6FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    color: '#2563EB',
    fontSize: '0.9rem'
  },
  nombreResidente: {
    fontWeight: '700',
    margin: 0
  },
  apto: {
    fontSize: '0.75rem',
    color: '#64748B',
    margin: '0.15rem 0 0 0',
    fontWeight: '600'
  },
  horarioBadge: {
    backgroundColor: '#F1F5F9',
    color: '#334155',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.8rem'
  },
  semaforoContenedor: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  semaforoIndicador: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  motivoRechazo: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  acciones: {
    display: 'flex',
    gap: '0.5rem'
  },
  btnAccionDetalle: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#4F46E5',
      color: '#FFFFFF'
    }
  },
  btnAccionAprobar: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#059669',
      color: '#FFFFFF'
    }
  },
  btnAccionRechazar: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#DC2626',
      color: '#FFFFFF'
    }
  },
  modalContenido: {
    padding: '2rem'
  },
  modalTitulo: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#1E293B',
    margin: '0 0 1.5rem 0'
  },
  modalDescripcion: {
    color: '#64748B',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    lineHeight: '1.5'
  },
  detalleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
    marginBottom: '1.5rem'
  },
  detalleItem: {
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #E2E8F0'
  },
  detalleLabel: {
    fontWeight: '700',
    color: '#475569',
    display: 'block',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem'
  },
  detalleValor: {
    color: '#1E293B',
    fontWeight: '600'
  },
  textarea: {
    width: '100%',
    minHeight: '110px',
    padding: '0.85rem',
    borderRadius: '0.5rem',
    border: '1px solid #E2E8F0',
    fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: '#2563EB'
    }
  },
  botonesModal: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  btnModalCancelar: {
    backgroundColor: '#F1F5F9',
    color: '#1E293B',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    fontWeight: '700'
  },
  btnModalConfirmar: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700'
  },
  btnCerrarModal: {
    width: '100%',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    marginTop: '1.5rem',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#1D4ED8'
    }
  }
};

export default AprobacionReservas;
