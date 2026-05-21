/**
 * Informes.jsx
 * ─────────────────────────────────────────────────────────
 * Centro de Informes y Reportes Analíticos de SmartHall.
 * Permite a administradores y supervisores visualizar, filtrar
 * y exportar datos críticos sobre reservas, préstamos de insumos y auditoría.
 * 
 * Características Premium:
 *  - Carga optimizada con hooks existentes.
 *  - Integración robusta de **TanStack React Table** con ordenación y búsqueda.
 *  - Compilación nativa y descarga instantánea a **CSV con BOM UTF-8** para compatibilidad con Excel.
 *  - Hoja de estilos de impresión nativa `@media print` para generar PDFs corporativos impecables.
 *  - UI sofisticada con micro-interacciones y diseño refinado.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useReservas } from '../hooks/useReservas';
import { usePrestamos } from '../hooks/usePrestamos';
import { useAuditoria } from '../hooks/useAuditoria';
import { useAuth } from '../context/AuthContext';
import EstadoBadge from '../components/ui/EstadoBadge';
import Badge from '../components/ui/Badge';
import { useUIFeedback } from '../context/UIFeedbackContext';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  AlertTriangle,
  FileText,
  RotateCcw,
  ArrowUpDown,
  TrendingUp,
  Package,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Informes = () => {
  const { profile } = useAuth();
  const { showToast } = useUIFeedback();
  
  // Hooks de datos
  const { reservas, loading: loadingReservas, fetchReservas } = useReservas();
  const { prestamos, loading: loadingPrestamos, fetchPrestamos } = usePrestamos();
  const { logs, loading: loadingAuditoria, fetchLogs } = useAuditoria();

  // Estados del Centro de Reportes
  const [tipoReporte, setTipoReporte] = useState('reservas'); // 'reservas', 'prestamos', 'auditoria'
  const [filtroTexto, setFiltroTexto] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroExtra, setFiltroExtra] = useState('todos'); // Reservas: 'todos', 'aprobada', 'pendiente', etc. Prestamos: 'todos', 'entregado', 'devuelto', etc.

  // Ordenamiento y Paginación de Tabla
  const [sorting, setSorting] = useState([{ id: 'fecha_evento', desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Sincronizar el reporte y su ordenamiento para evitar desajustes y warnings de TanStack Table
  const handleCambiarReporte = (nuevoTipo) => {
    setTipoReporte(nuevoTipo);
    if (nuevoTipo === 'reservas') {
      setSorting([{ id: 'fecha_evento', desc: true }]);
    } else if (nuevoTipo === 'prestamos') {
      setSorting([{ id: 'fecha_prestamo', desc: true }]);
    } else if (nuevoTipo === 'auditoria') {
      setSorting([{ id: 'created_at', desc: true }]);
    }
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  // Cargar datos al cambiar de pestaña
  useEffect(() => {
    cargarDatos();
  }, [tipoReporte]);

  const cargarDatos = async () => {
    setFiltroTexto('');
    setFiltroExtra('todos');
    if (tipoReporte === 'reservas') {
      await fetchReservas();
    } else if (tipoReporte === 'prestamos') {
      await fetchPrestamos();
    } else if (tipoReporte === 'auditoria') {
      await fetchLogs();
    }
  };

  // ────────────────────────────────────────────────────────
  // 1. Filtrado de Datos para cada Reporte
  // ────────────────────────────────────────────────────────

  const datosFiltrados = useMemo(() => {
    let rawData = [];
    if (tipoReporte === 'reservas') rawData = Array.isArray(reservas) ? reservas : [];
    else if (tipoReporte === 'prestamos') rawData = Array.isArray(prestamos) ? prestamos : [];
    else if (tipoReporte === 'auditoria') rawData = Array.isArray(logs) ? logs : [];

    return rawData.filter(item => {
      // Filtros de fecha generales
      if (tipoReporte === 'reservas' && item.fecha_evento) {
        if (fechaDesde && new Date(item.fecha_evento) < new Date(fechaDesde)) return false;
        if (fechaHasta && new Date(item.fecha_evento) > new Date(fechaHasta)) return false;
      } else if (tipoReporte === 'prestamos' && item.created_at) {
        const fPrestamo = item.fecha_prestamo || item.created_at;
        const dateObj = new Date(fPrestamo);
        if (fechaDesde && dateObj < new Date(fechaDesde + 'T00:00:00')) return false;
        if (fechaHasta && dateObj > new Date(fechaHasta + 'T23:59:59')) return false;
      } else if (tipoReporte === 'auditoria' && item.created_at) {
        const dateObj = new Date(item.created_at);
        if (fechaDesde && dateObj < new Date(fechaDesde + 'T00:00:00')) return false;
        if (fechaHasta && dateObj > new Date(fechaHasta + 'T23:59:59')) return false;
      }

      // Filtros extras de estado/categorías
      if (filtroExtra !== 'todos') {
        if (tipoReporte === 'reservas' && item.estado !== filtroExtra) return false;
        if (tipoReporte === 'prestamos' && item.estado !== filtroExtra) return false;
        if (tipoReporte === 'auditoria' && item.accion !== filtroExtra) return false;
      }

      // Búsqueda global por texto
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase();
        if (tipoReporte === 'reservas') {
          const nombres = `${item.usuarios?.nombres} ${item.usuarios?.apellidos}`.toLowerCase();
          const apto = (item.usuarios?.numero_apto || '').toLowerCase();
          const evento = (item.tipo_evento || '').toLowerCase();
          return nombres.includes(q) || apto.includes(q) || evento.includes(q);
        } else if (tipoReporte === 'prestamos') {
          const nombres = `${item.reservas?.usuarios?.nombres} ${item.reservas?.usuarios?.apellidos}`.toLowerCase();
          const apto = (item.reservas?.usuarios?.numero_apto || '').toLowerCase();
          const insumo = (item.insumos?.nombre || '').toLowerCase();
          return nombres.includes(q) || apto.includes(q) || insumo.includes(q);
        } else if (tipoReporte === 'auditoria') {
          const nombres = `${item.usuarios?.nombres} ${item.usuarios?.apellidos}`.toLowerCase();
          const entidad = (item.entidad || '').toLowerCase();
          const accion = (item.accion || '').toLowerCase();
          const detalles = (typeof item.detalles === 'string' ? item.detalles : JSON.stringify(item.detalles)).toLowerCase();
          return nombres.includes(q) || entidad.includes(q) || accion.includes(q) || detalles.includes(q);
        }
      }

      return true;
    });
  }, [tipoReporte, reservas, prestamos, logs, fechaDesde, fechaHasta, filtroTexto, filtroExtra]);

  // ────────────────────────────────────────────────────────
  // 2. Definición de Columnas de TanStack Table
  // ────────────────────────────────────────────────────────

  const columnasReservas = useMemo(() => [
    {
      id: 'residente',
      header: 'Residente / Apto',
      accessorFn: row => `${row.revisado_por_user?.nombres} ${row.revisado_por_user?.apellidos}`,
      cell: info => {
        const row = info.row.original;
        return (
          <div style={styles.celdaDobleLine}>
            <span style={styles.lineaPrincipal}>{row.revisado_por_user?.nombres} {row.revisado_por_user?.apellidos}</span>
            <span style={styles.lineaSecundaria}>Apto {row.revisado_por_user?.numero_apto || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      id: 'fecha_evento',
      accessorKey: 'fecha_evento',
      header: ({ column }) => (
        <button style={styles.btnSortable} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Fecha Evento <ArrowUpDown size={12} />
        </button>
      ),
      cell: info => {
        const val = info.getValue();
        return (
          <span style={{ fontWeight: '600' }}>
            {new Date(val + 'T12:00:00').toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        );
      }
    },
    {
      id: 'horario',
      header: 'Horario',
      cell: info => `${info.row.original.hora_inicio} - ${info.row.original.hora_fin}`
    },
    {
      accessorKey: 'tipo_evento',
      header: 'Evento'
    },
    {
      accessorKey: 'numero_invitados',
      header: 'Invitados',
      cell: info => <span style={{ fontWeight: '700' }}>{info.getValue()}</span>
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: info => <EstadoBadge estado={info.getValue()} />
    },
    {
      id: 'revisor',
      header: 'Revisado Por',
      cell: info => {
        const row = info.row.original;
        return row.usuarios ? `${row.usuarios.nombres} ${row.usuarios.apellidos}` : '-';
      }
    }
  ], []);

  const columnasPrestamos = useMemo(() => [
    {
      id: 'insumo',
      accessorKey: 'insumos.nombre',
      header: 'Insumo',
      cell: info => <span style={{ fontWeight: '600' }}>{info.getValue()}</span>
    },
    {
      accessorKey: 'cantidad',
      header: 'Cantidad',
      cell: info => <span style={{ fontWeight: '700' }}>{info.getValue()}</span>
    },
    {
      id: 'residente',
      header: 'Asociado A',
      cell: info => {
        const row = info.row.original;
        const rName = `${row.reservas?.usuarios?.nombres || ''} ${row.reservas?.usuarios?.apellidos || ''}`.trim() || 'N/A';
        return (
          <div style={styles.celdaDobleLine}>
            <span style={styles.lineaPrincipal}>{rName}</span>
            <span style={styles.lineaSecundaria}>Apto {row.reservas?.usuarios?.numero_apto || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      id: 'fecha_prestamo',
      accessorKey: 'fecha_prestamo',
      header: ({ column }) => (
        <button style={styles.btnSortable} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Fecha Préstamo <ArrowUpDown size={12} />
        </button>
      ),
      cell: info => {
        const row = info.row.original;
        const f = info.getValue() || row.created_at;
        return f ? new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
      }
    },
    {
      id: 'fecha_devolucion',
      header: 'Fecha Devolución',
      cell: info => {
        const f = info.row.original.fecha_devolucion;
        return f ? new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
      }
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: info => (
        <Badge variant={
          info.getValue() === 'devuelto' ? 'success' :
          info.getValue() === 'entregado' ? 'info' :
          info.getValue() === 'danado' ? 'error' : 'warning'
        }>
          {info.getValue()?.toUpperCase()}
        </Badge>
      )
    },
    {
      accessorKey: 'observaciones_admin',
      header: 'Observaciones'
    }
  ], []);

  const columnasAuditoria = useMemo(() => [
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => (
        <button style={styles.btnSortable} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Fecha / Hora <ArrowUpDown size={12} />
        </button>
      ),
      cell: info => (
        <div style={styles.celdaDobleLine}>
          <span style={styles.lineaPrincipal}>{new Date(info.getValue()).toLocaleDateString()}</span>
          <span style={styles.lineaSecundaria}>{new Date(info.getValue()).toLocaleTimeString()}</span>
        </div>
      )
    },
    {
      id: 'usuario',
      header: 'Usuario',
      cell: info => {
        const userObj = info.row.original.usuarios;
        return userObj ? `${userObj.nombres} ${userObj.apellidos}` : 'Sistema';
      }
    },
    {
      accessorKey: 'accion',
      header: 'Acción',
      cell: info => (
        <Badge variant={
          info.getValue() === 'CREAR' ? 'success' :
          info.getValue() === 'ELIMINAR' ? 'error' :
          info.getValue() === 'EDITAR' ? 'warning' : 'info'
        }>
          {info.getValue()}
        </Badge>
      )
    },
    {
      accessorKey: 'entidad',
      header: 'Módulo'
    },
    {
      accessorKey: 'detalles',
      header: 'Detalle Acción',
      cell: info => {
        const val = info.getValue();
        return typeof val === 'string' ? val : JSON.stringify(val);
      }
    }
  ], []);

  // Determinar columnas activas
  const columnasActivas = useMemo(() => {
    if (tipoReporte === 'reservas') return columnasReservas;
    if (tipoReporte === 'prestamos') return columnasPrestamos;
    return columnasAuditoria;
  }, [tipoReporte, columnasReservas, columnasPrestamos, columnasAuditoria]);

  // Hook de TanStack Table
  const table = useReactTable({
    data: datosFiltrados,
    columns: columnasActivas,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const loading = tipoReporte === 'reservas' ? loadingReservas :
                  tipoReporte === 'prestamos' ? loadingPrestamos : loadingAuditoria;

  // ────────────────────────────────────────────────────────
  // 3. Exportar a CSV Premium (con BOM UTF-8)
  // ────────────────────────────────────────────────────────
  
  const exportarCSV = () => {
    if (datosFiltrados.length === 0) {
      showToast('No hay datos disponibles en el reporte actual para exportar.', 'warning');
      return;
    }

    let headers = [];
    let rows = [];

    if (tipoReporte === 'reservas') {
      headers = ['Residente', 'Apartamento', 'Fecha Evento', 'Hora Inicio', 'Hora Fin', 'Evento', 'Invitados', 'Estado', 'Revisor'];
      rows = datosFiltrados.map(r => [
        `"${r.revisado_por_user?.nombres} ${r.revisado_por_user?.apellidos}"`,
        `"${r.revisado_por_user?.numero_apto || 'N/A'}"`,
        r.fecha_evento,
        r.hora_inicio,
        r.hora_fin,
        `"${r.tipo_evento}"`,
        r.numero_invitados,
        r.estado,
        `"${r.usuarios ? `${r.usuarios.nombres} ${r.usuarios.apellidos}` : '-'}"`
      ]);
    } else if (tipoReporte === 'prestamos') {
      headers = ['Insumo', 'Cantidad', 'Residente', 'Apartamento', 'Fecha Préstamo', 'Fecha Devolución', 'Estado', 'Observaciones'];
      rows = datosFiltrados.map(p => [
        `"${p.insumos?.nombre}"`,
        p.cantidad,
        `"${p.reservas?.usuarios?.nombres || ''} ${p.reservas?.usuarios?.apellidos || ''}"`,
        `"${p.reservas?.usuarios?.numero_apto || 'N/A'}"`,
        p.fecha_prestamo || p.created_at,
        p.fecha_devolucion || '',
        p.estado,
        `"${p.observaciones_admin || ''}"`
      ]);
    } else if (tipoReporte === 'auditoria') {
      headers = ['Fecha', 'Hora', 'Usuario', 'Accion', 'Modulo', 'Detalle'];
      rows = datosFiltrados.map(l => [
        new Date(l.created_at).toLocaleDateString(),
        new Date(l.created_at).toLocaleTimeString(),
        `"${l.usuarios ? `${l.usuarios.nombres} ${l.usuarios.apellidos}` : 'Sistema'}"`,
        l.accion,
        l.entidad,
        `"${typeof l.detalles === 'string' ? l.detalles : JSON.stringify(l.detalles).replace(/"/g, '""')}"`
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // BOM para que Excel detecte acentos perfectamente (UTF-8)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SmartHall_Reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ────────────────────────────────────────────────────────
  // 4. Imprimir / Generar PDF
  // ────────────────────────────────────────────────────────
  const imprimirReporte = () => {
    window.print();
  };

  // Evitar acceso a residentes
  if (!['administrador', 'supervisor'].includes(profile?.rol)) {
    return (
      <div style={styles.accesoNegadoContainer}>
        <div style={styles.accesoNegadoCard}>
          <AlertTriangle size={48} color="var(--danger)" />
          <h2>Acceso Restringido</h2>
          <p>Solo personal administrativo tiene acceso al Centro de Informes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.container}>
      {/* CSS Inyectado para Impresión Impecable */}
      <style>{`
        @media print {
          body {
            background-color: #FFFFFF !important;
            color: #000000 !important;
            font-size: 10pt !important;
          }
          aside, nav, header, .no-print, button, input, select, .pagination-controls {
            display: none !important;
          }
          main, .print-container {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 2rem !important;
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 1rem !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 1rem !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #CBD5E1 !important;
            padding: 8px !important;
            text-align: left !important;
            font-size: 9pt !important;
          }
          .print-table th {
            background-color: #F8FAFC !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      {/* Cabecera Invisible en Pantalla pero Visible en Impresión */}
      <div className="print-header" style={styles.printHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>SmartHall - Software Residencial</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.9rem' }}>Reporte de Gestión Administrativa</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: '600' }}>Tipo: {tipoReporte.toUpperCase()}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Generado el: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Cabecera Principal */}
      <header className="no-print" style={styles.header}>
        <div>
          <h1 style={styles.titulo}>Centro de Informes</h1>
          <p style={styles.subtitulo}>Genera analíticas avanzadas, descarga registros en CSV o exporta PDF de forma estructurada.</p>
        </div>
        
        {/* Selector de Pestaña Principal */}
        <div style={styles.tabsContainer}>
          <button
            onClick={() => handleCambiarReporte('reservas')}
            style={{
              ...styles.tabButton,
              ...(tipoReporte === 'reservas' ? styles.tabButtonActive : {})
            }}
          >
            <TrendingUp size={16} />
            Reservas
          </button>
          <button
            onClick={() => handleCambiarReporte('prestamos')}
            style={{
              ...styles.tabButton,
              ...(tipoReporte === 'prestamos' ? styles.tabButtonActive : {})
            }}
          >
            <Package size={16} />
            Préstamos e Insumos
          </button>
          <button
            onClick={() => handleCambiarReporte('auditoria')}
            style={{
              ...styles.tabButton,
              ...(tipoReporte === 'auditoria' ? styles.tabButtonActive : {})
            }}
          >
            <History size={16} />
            Auditoría
          </button>
        </div>
      </header>

      {/* Panel de Filtros Premium */}
      <section className="no-print" style={styles.filtrosCard}>
        <div style={styles.filtrosGrid}>
          {/* Rango de Fechas */}
          <div style={styles.filtroItem}>
            <label style={styles.filtroLabel}>Fecha Desde:</label>
            <div className="input-icon-group-focus-within" style={styles.inputIconGroup}>
              <Calendar size={16} color="var(--text-muted)" />
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                style={styles.filtroInput}
              />
            </div>
          </div>

          <div style={styles.filtroItem}>
            <label style={styles.filtroLabel}>Fecha Hasta:</label>
            <div className="input-icon-group-focus-within" style={styles.inputIconGroup}>
              <Calendar size={16} color="var(--text-muted)" />
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                style={styles.filtroInput}
              />
            </div>
          </div>

          {/* Filtro extra dinámico */}
          <div style={styles.filtroItem}>
            <label style={styles.filtroLabel}>
              {tipoReporte === 'reservas' ? 'Filtrar por Estado:' :
               tipoReporte === 'prestamos' ? 'Filtrar por Entrega:' : 'Filtrar por Acción:'}
            </label>
            <select
              value={filtroExtra}
              onChange={e => setFiltroExtra(e.target.value)}
              style={styles.filtroSelect}
            >
              <option value="todos">Todos los registros</option>
              {tipoReporte === 'reservas' && (
                <>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="cancelada">Cancelada</option>
                </>
              )}
              {tipoReporte === 'prestamos' && (
                <>
                  <option value="solicitado">Solicitado</option>
                  <option value="entregado">Entregado</option>
                  <option value="devuelto">Devuelto</option>
                  <option value="danado">Dañado</option>
                  <option value="rechazado">Rechazado</option>
                </>
              )}
              {tipoReporte === 'auditoria' && (
                <>
                  <option value="CREAR">CREAR</option>
                  <option value="EDITAR">EDITAR</option>
                  <option value="ELIMINAR">ELIMINAR</option>
                  <option value="APROBAR">APROBAR</option>
                  <option value="RECHAZAR">RECHAZAR</option>
                </>
              )}
            </select>
          </div>

          {/* Buscador de Texto */}
          <div style={{ ...styles.filtroItem, gridColumn: 'span 2' }}>
            <label style={styles.filtroLabel}>Búsqueda Rápida:</label>
            <div className="input-icon-group-focus-within" style={styles.inputIconGroup}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder={
                  tipoReporte === 'reservas' ? 'Buscar por residente, apartamento, evento...' :
                  tipoReporte === 'prestamos' ? 'Buscar por residente, apartamento, insumo...' :
                  'Buscar por usuario, acción, entidad...'
                }
                value={filtroTexto}
                onChange={e => setFiltroTexto(e.target.value)}
                style={styles.filtroInputText}
              />
            </div>
          </div>

          {/* Botones de Descarga e Impresión */}
          <div style={styles.accionesReporte}>
            <button onClick={exportarCSV} className="btn-csv-export" title="Descargar Excel/CSV">
              <FileSpreadsheet size={18} />
              CSV
            </button>
            <button onClick={imprimirReporte} className="btn-pdf-print" title="Imprimir o guardar como PDF">
              <Printer size={18} />
              PDF / Imprimir
            </button>
            <button
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
                setFiltroTexto('');
                setFiltroExtra('todos');
                cargarDatos();
              }}
              className="btn-reset-filters"
              title="Limpiar filtros y recargar"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Visualización de Datos / Caja de Tabla */}
      <main className="print-container" style={styles.tablaCard}>
        {loading ? (
          <div style={styles.cargandoContenedor}>
            <div className="spinner" style={styles.spinner} />
            <p>Compilando datos del reporte...</p>
          </div>
        ) : datosFiltrados.length === 0 ? (
          <div style={styles.sinResultados}>
            <FileText size={48} color="#94A3B8" />
            <h3>No se encontraron resultados</h3>
            <p>Pruebe ajustando el rango de fechas o los filtros globales de búsqueda.</p>
          </div>
        ) : (
          <>
            <div style={styles.tablaWrapper}>
              <table className="print-table" style={styles.tabla}>
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
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
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="table-row-hoverable" style={styles.fila}>
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

            {/* Paginación - Oculta en Impresión */}
            <footer className="pagination-controls no-print" style={styles.paginacion}>
              <span style={styles.paginacionInfo}>
                Mostrando página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} ({datosFiltrados.length} registros totales)
              </span>
              <div style={styles.paginacionBotones}>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  style={{
                    ...styles.btnPaginacion,
                    opacity: !table.getCanPreviousPage() ? 0.5 : 1,
                    cursor: !table.getCanPreviousPage() ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  style={{
                    ...styles.btnPaginacion,
                    opacity: !table.getCanNextPage() ? 0.5 : 1,
                    cursor: !table.getCanNextPage() ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1280px',
    margin: '0 auto'
  },
  printHeader: {
    display: 'none' // Solo visible al imprimir
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1.5rem'
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
  tabsContainer: {
    display: 'flex',
    backgroundColor: '#F1F5F9',
    padding: '4px',
    borderRadius: '12px',
    gap: '4px',
    border: '1px solid #E2E8F0'
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.625rem 1.25rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748B',
    transition: 'all 0.2s ease',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer'
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    color: 'var(--primary)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
  },
  filtrosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  },
  filtrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.25rem',
    alignItems: 'end'
  },
  filtroItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem'
  },
  filtroLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  inputIconGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '0 0.75rem',
    height: '42px',
    gap: '8px',
    transition: 'border-color 0.2s'
  },
  filtroInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    width: '100%',
    fontSize: '0.875rem',
    color: '#0F172A'
  },
  filtroInputText: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    width: '100%',
    fontSize: '0.875rem',
    color: '#0F172A'
  },
  filtroSelect: {
    height: '42px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '0 0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#0F172A',
    outline: 'none'
  },
  accionesReporte: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'end',
    flexWrap: 'wrap',
    marginTop: '0.5rem',
    gridColumn: '1 / -1' // Forzar que ocupe todo el ancho disponible si está en grid
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
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #E2E8F0',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
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
  btnSortable: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    fontSize: '0.75rem',
    padding: 0
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
  paginacion: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  paginacionInfo: {
    fontSize: '0.875rem',
    color: '#64748B'
  },
  paginacionBotones: {
    display: 'flex',
    gap: '6px'
  },
  btnPaginacion: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#334155',
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    transition: 'all 0.2s'
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

export default Informes;
