/**
 * Configuracion.jsx
 * ─────────────────────────────────────────────────────────
 * Panel de administración para gestionar las configuraciones dinámicas del sistema SmartHall.
 *
 * Este componente permite crear, editar y eliminar opciones de las siguientes categorías:
 *   - Tipos de Evento
 *   - Categorías de Inventario
 *   - Unidades de Medida
 *   - Bodegas / Ubicaciones
 *   - Roles de Personal
 *   - Estados de Instalación
 *
 * Hooks utilizados:
 *   - useConfiguraciones: Hook personalizado que provee CRUD sobre la tabla `configuraciones_sistema`.
 *   - useState / useEffect: Hooks de React para manejo de estado y efectos secundarios.
 *
 * Servicios externos:
 *   - supabase: Cliente de Supabase para operaciones directas sobre las tablas
 *     `categorias_insumo` y `configuraciones_sistema`.
 *
 * Componentes UI:
 *   - Badge (importado pero no utilizado actualmente en el JSX).
 *   - Modal: Componente reutilizable para diálogos modales.
 *
 * Renderiza una cuadrícula de tarjetas, una por cada categoría, con su lista de opciones
 * y botones para agregar, editar y eliminar. También incluye dos modales:
 *   1. Modal de creación/edición de opciones.
 *   2. Modal de confirmación de eliminación.
 *
 * @component
 */

import React, { useState, useEffect } from 'react';
import { useConfiguraciones } from '../hooks/useConfiguraciones';
import { supabase } from '../lib/supabase';
import { Settings, Plus, Edit2, Trash2, Save, X, Layers, Ruler, UserCheck, Activity, AlertTriangle, Tag, MapPin } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const Configuracion = () => {
  /**
   * Desestructura el hook useConfiguraciones para obtener:
   *   - opciones: Lista de opciones de configuración cargadas desde la BD.
   *   - loading: Indicador de carga en progreso.
   *   - fetchOpciones: Función para recargar las opciones desde Supabase.
   *   - crearOpcion: Función para insertar una nueva opción.
   *   - actualizarOpcion: Función para actualizar una opción existente por ID.
   *   - eliminarOpcion: Función para eliminar una opción por ID.
   */
  const { opciones, loading, fetchOpciones, crearOpcion, actualizarOpcion, eliminarOpcion } = useConfiguraciones();

  /** Lista de categorías de insumo cargadas directamente desde la tabla `categorias_insumo` de Supabase. */
  const [opcionesInsumo, setOpcionesInsumo] = useState([]);

  /** Controla la visibilidad del modal de creación/edición. */
  const [modalOpen, setModalOpen] = useState(false);

  /** ID de la opción que se está editando. Si es null, se está creando una nueva opción. */
  const [editingId, setEditingId] = useState(null);

  /**
   * Estado del formulario del modal.
   * Contiene los campos: categoria, clave, valor y orden.
   * Se inicializa al abrir el modal ya sea para crear o editar.
   */
  const [formData, setFormData] = useState({ categoria: '', clave: '', valor: '', orden: 0 });

  /**
   * Efecto que se ejecuta una sola vez al montar el componente.
   * Carga todas las opciones de configuración generales (via hook) y
   * las categorías de insumo específicas (consulta directa a Supabase).
   */
  useEffect(() => {
    fetchOpciones();
    const loadInsumoCats = async () => {
      const { data } = await supabase.from('categorias_insumo').select('*').order('nombre');
      if (data) setOpcionesInsumo(data);
    };
    loadInsumoCats();
  }, []);

  // Eliminamos el auto-seed para evitar bloqueos por RLS sin interacción del usuario.

  /**
   * Arreglo estático que define las categorías de configuración disponibles.
   * Cada objeto contiene:
   *   - id: Identificador único de la categoría (coincide con el campo 'categoria' en BD).
   *   - nombre: Nombre visible de la categoría.
   *   - icon: Componente de icono de lucide-react para representar la categoría.
   *   - desc: Descripción breve de lo que gestiona la categoría.
   */
  const categorias = [
    { id: 'tipo_evento', nombre: 'Tipos de Evento', icon: Activity, desc: 'Categorías de reservas permitidas.' },
    { id: 'categoria_insumo', nombre: 'Categorías de Inventario', icon: Tag, desc: 'Clasificación de insumos y activos.' },
    { id: 'unidad_insumo', nombre: 'Unidades de Medida', icon: Ruler, desc: 'Unidades para el inventario.' },
    { id: 'bodega_insumo', nombre: 'Bodegas / Ubicaciones', icon: MapPin, desc: 'Ubicaciones físicas para el inventario.' },
    { id: 'rol_personal', nombre: 'Roles de Personal', icon: UserCheck, desc: 'Cargos dentro de la administración.' },
    { id: 'estado_instalacion', nombre: 'Estados de Instalación', icon: Layers, desc: 'Disponibilidad de áreas.' }
  ];

  /**
   * Abre el modal de creación o edición de una opción.
   * @param {Object|null} opcion - Objeto de la opción a editar. Si es null, se abre en modo creación.
   * @param {string} catId - ID de la categoría padre (solo necesario al crear una nueva opción).
   * @returns {void}
   */
  const handleOpenModal = (opcion = null, catId = '') => {
    if (opcion) {
      // Modo edición: precarga los datos de la opción seleccionada
      setEditingId(opcion.id);
      setFormData({ ...opcion });
    } else {
      // Modo creación: inicializa el formulario con la categoría seleccionada
      // y calcula el siguiente número de orden
      setEditingId(null);
      setFormData({ categoria: catId, clave: '', valor: '', orden: opciones.filter(o => o.categoria === catId).length + 1 });
    }
    setModalOpen(true);
  };

  /**
   * Maneja el envío del formulario de creación/edición.
   * La lógica varía según la categoría:
   *   - Para 'categoria_insumo': opera directamente sobre la tabla `categorias_insumo` de Supabase.
   *   - Para las demás: utiliza las funciones del hook useConfiguraciones sobre `configuraciones_sistema`.
   * @param {Event} e - Evento de envío del formulario HTML.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    let res;
    
    // Si la categoría es 'categoria_insumo', usamos la tabla específica
    if (formData.categoria === 'categoria_insumo') {
      const datosCat = { nombre: formData.valor, descripcion: formData.valor };
      if (editingId) {
        const { error } = await supabase.from('categorias_insumo').update(datosCat).eq('id', editingId);
        res = { success: !error, error: error?.message };
      } else {
        const { error } = await supabase.from('categorias_insumo').insert([datosCat]);
        res = { success: !error, error: error?.message };
      }
    } else {
      // Configuraciones generales
      if (editingId) {
        res = await actualizarOpcion(editingId, formData);
      } else {
        res = await crearOpcion(formData);
      }
    }

    if (res.success) {
      setModalOpen(false);
      await fetchOpciones();
      // También necesitamos cargar las categorías si cambiaron
      if (formData.categoria === 'categoria_insumo') {
        const { data } = await supabase.from('categorias_insumo').select('*');
        setOpcionesInsumo(data);
      }
    }
  };

    /** Controla la visibilidad del modal de confirmación de eliminación. */
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    /** ID de la opción que el usuario desea eliminar. */
    const [idAEliminar, setIdAEliminar] = useState(null);

    /** Categoría de la opción que se va a eliminar (necesario para saber si es 'categoria_insumo'). */
    const [catAEliminar, setCatAEliminar] = useState(null);

    /**
     * Prepara la eliminación abriendo el modal de confirmación.
     * Almacena el ID y la categoría de la opción a eliminar.
     * @param {number} id - ID de la opción a eliminar.
     * @param {string} cat - Categoría de la opción (ej: 'tipo_evento', 'categoria_insumo').
     * @returns {void}
     */
    const handleConfirmarEliminacion = (id, cat) => {
        setIdAEliminar(id);
        setCatAEliminar(cat);
        setConfirmDeleteOpen(true);
    };

    /**
     * Ejecuta la eliminación confirmada de una opción.
     * La lógica varía según la categoría:
     *   - Para 'categoria_insumo': elimina directamente de la tabla `categorias_insumo`.
     *   - Para las demás: utiliza la función eliminarOpcion del hook useConfiguraciones.
     * Cierra el modal y recarga los datos después de la eliminación.
     * @returns {Promise<void>}
     */
    const ejecutarEliminacion = async () => {
        if (idAEliminar) {
            if (catAEliminar === 'categoria_insumo') {
                const { error } = await supabase.from('categorias_insumo').delete().eq('id', idAEliminar);
                if (!error) {
                    const { data } = await supabase.from('categorias_insumo').select('*').order('nombre');
                    setOpcionesInsumo(data || []);
                }
            } else {
                await eliminarOpcion(idAEliminar);
                fetchOpciones();
            }
            setConfirmDeleteOpen(false);
            setIdAEliminar(null);
            setCatAEliminar(null);
        }
    };

  /**
   * Renderiza la interfaz completa del panel de configuración.
   *
   * Estructura:
   *   - Encabezado con título e icono.
   *   - Cuadrícula de tarjetas (una por cada categoría).
   *     Cada tarjeta contiene: icono, nombre, descripción, lista de opciones y botón de agregar.
   *   - Modal de creación/edición con formulario.
   *   - Modal de confirmación de eliminación con advertencia.
   */
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Configuración del Sistema</h1>
          <p style={styles.subtitle}>Gestiona las listas dinámicas y valores maestros de SmartHall.</p>
        </div>
        <Settings size={32} color="var(--primary)" />
      </header>

      {/* Sección principal: cuadrícula de categorías */}
      <div style={styles.grid}>
        {categorias.map(cat => (
          <div key={cat.id} style={styles.card}>
            {/* Encabezado de la tarjeta: icono, título y botón de agregar */}
            <div style={styles.cardHeader}>
              <div style={styles.cardIconTitle}>
                <cat.icon size={20} color="var(--primary)" />
                <h3 style={styles.cardTitle}>{cat.nombre}</h3>
              </div>
              {/* Botón para abrir modal en modo creación para esta categoría */}
              <button 
                onClick={() => handleOpenModal(null, cat.id)} 
                style={styles.addButton}
                title="Añadir opción"
              >
                <Plus size={16} />
              </button>
            </div>
            <p style={styles.cardDesc}>{cat.desc}</p>
            
            {/* Lista de opciones de la categoría */}
            <div style={styles.list}>
              {/**
               * Renderizado condicional:
               * - Si la lista está vacía, muestra mensaje de "No hay opciones definidas".
               *   Para 'bodega_insumo' se muestra un botón de carga predeterminada.
               * - Si hay opciones, renderiza cada una con sus acciones (editar/eliminar).
               *
               * Para 'categoria_insumo' se usa opcionesInsumo (fuente distinta: tabla propia).
               * Para las demás categorías se filtra opciones por la categoría actual.
               */}
              {(cat.id === 'categoria_insumo' ? opcionesInsumo : opciones.filter(o => o.categoria === cat.id)).length === 0 ? (
                <div style={styles.emptyContainer}>
                  <p style={styles.empty}>No hay opciones definidas.</p>
                  {/**
                   * Botón especial para bodegas: carga 3 opciones predeterminadas
                   * directamente en la tabla configuraciones_sistema.
                   */}
                  {cat.id === 'bodega_insumo' && (
                    <button 
                      onClick={async () => {
                        const defaults = [
                          { categoria: 'bodega_insumo', clave: 'bodega_principal', valor: 'Bodega Principal', orden: 1, activo: true },
                          { categoria: 'bodega_insumo', clave: 'bodega_auxiliar', valor: 'Bodega Auxiliar', orden: 2, activo: true },
                          { categoria: 'bodega_insumo', clave: 'bodega_parqueadero', valor: 'Bodega Parqueadero', orden: 3, activo: true }
                        ];
                        await supabase.from('configuraciones_sistema').insert(defaults);
                        fetchOpciones();
                      }}
                      style={{...styles.btnSecundario, padding: '0.5rem 1rem', fontSize: '0.8rem'}}
                    >
                      Cargar predeterminadas
                    </button>
                  )}
                </div>
              ) : (
                /**
                 * Renderiza la lista de opciones.
                 * Para 'categoria_insumo' transforma los registros de categorias_insumo
                 * al formato esperado ({ id, valor, categoria }).
                 */
                (cat.id === 'categoria_insumo' 
                  ? opcionesInsumo.map(o => ({ id: o.id, valor: o.nombre, categoria: 'categoria_insumo' })) 
                  : opciones.filter(o => o.categoria === cat.id)
                ).map(opc => (
                  <div key={opc.id} style={styles.listItem}>
                    <span>{opc.valor}</span>
                    <div style={styles.actions}>
                      {/* Botón de editar: abre el modal en modo edición */}
                      <button onClick={() => handleOpenModal(opc)} style={styles.actionBtn}>
                        <Edit2 size={14} />
                      </button>
                      {/* Botón de eliminar: abre el modal de confirmación */}
                      <button 
                        onClick={() => handleConfirmarEliminacion(opc.id, opc.categoria)} 
                        style={{...styles.actionBtn, color: 'var(--error)'}}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edición/Creación: se muestra solo cuando modalOpen es true */}
      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>{editingId ? 'Editar Opción' : 'Nueva Opción'}</h2>
            <form onSubmit={handleSubmit}>
              {/* Campo "Valor Visible": el valor que se muestra al usuario en la interfaz */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Valor Visible</label>
                <input 
                  style={styles.input}
                  required
                  value={formData.valor}
                  /**
                   * Al escribir, actualiza el valor y genera automáticamente la clave
                   * convirtiendo a minúsculas y reemplazando espacios por guiones bajos.
                   */
                  onChange={e => setFormData({...formData, valor: e.target.value, clave: e.target.value.toLowerCase().replace(/ /g, '_')})}
                  placeholder="Ej: Cumpleaños, Caja, etc."
                />
              </div>
              {/* Campo numérico que define el orden de aparición en la lista */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Orden de aparición</label>
                <input 
                  type="number"
                  style={styles.input}
                  value={formData.orden}
                  onChange={e => setFormData({...formData, orden: parseInt(e.target.value)})}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setModalOpen(false)} style={styles.btnSecundario}>Cancelar</button>
                <button type="submit" style={styles.btnPrimario}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Modal de Confirmación de Eliminación: se muestra solo cuando confirmDeleteOpen es true */}
      {confirmDeleteOpen && (
        <Modal isOpen={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
          <div style={styles.modalContent}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              {/* Icono de advertencia en círculo rojo */}
              <div style={{ backgroundColor: '#FEF2F2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <AlertTriangle size={30} color="#EF4444" />
              </div>
              <h2 style={styles.modalTitle}>Confirmar Eliminación</h2>
            </div>
            
            <p style={{ textAlign: 'center', color: '#64748B', marginBottom: '2rem' }}>
              ¿Estás seguro de que deseas eliminar esta opción? Esta acción no se puede deshacer y podría afectar a registros que dependan de este valor.
            </p>

            <div style={styles.modalActions}>
              <button onClick={() => setConfirmDeleteOpen(false)} style={styles.btnSecundario}>Cancelar</button>
              {/* Botón de eliminación con color de peligro (rojo) */}
              <button onClick={ejecutarEliminacion} style={{...styles.btnPrimario, backgroundColor: '#EF4444'}}>Eliminar Permanentemente</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/**
 * Estilos inline del componente Configuracion.
 * Utiliza CSS-in-JS con objetos de estilo.
 * Variables CSS (var(--primary), var(--text-dark), etc.) están definidas globalmente.
 * La cuadrícula usa repeat(auto-fill, minmax(280px, 1fr)) para ser responsive.
 */
const styles = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' },
  title: { fontSize: '2rem', fontWeight: '800', color: 'var(--text-dark)', margin: 0 },
  subtitle: { color: 'var(--text-muted)', marginTop: '0.25rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: '1rem', 
    padding: '1.5rem', 
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  cardIconTitle: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  cardTitle: { fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-dark)', margin: 0 },
  cardDesc: { fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' },
  addButton: { 
    backgroundColor: 'var(--primary-light)', 
    color: 'var(--primary)', 
    border: 'none', 
    borderRadius: '50%', 
    width: '32px', 
    height: '32px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  listItem: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '0.75rem', 
    backgroundColor: '#f8fafc', 
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  actions: { display: 'flex', gap: '0.5rem' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' },
  emptyContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' },
  empty: { textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 },
  modalContent: { padding: '1rem' },
  modalTitle: { fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1E293B' },
  formGroup: { marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#475569' },
  input: { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' },
  btnPrimario: { backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' },
  btnSecundario: { backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }
};

export default Configuracion;
