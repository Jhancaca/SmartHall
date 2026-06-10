/**
 * @file Inventario.jsx
 * @description Página principal para la gestión de inventario del salón social.
 *              Permite visualizar, crear, editar y gestionar insumos y activos.
 *              Utiliza hooks personalizados para lógica de negocio (useInventario, useConfiguraciones),
 *              contexto de autenticación (useAuth), contexto de búsqueda global (useSearch),
 *              y contexto de retroalimentación UI (useUIFeedback).
 *              Renderiza una tabla paginada con filtros, modales para CRUD y devoluciones,
 *              y un formulario completo para registro/edición de insumos.
 * @module pages/Inventario
 * @requires react, useInventario, AuthContext, SearchContext, UIFeedbackContext, useConfiguraciones
 * @requires ui/Table, ui/Badge, ui/Modal, lucide-react (iconos)
 */

import { useState, useEffect } from 'react';
import { useInventario } from '../hooks/useInventario';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { useUIFeedback } from '../context/UIFeedbackContext';
import { useConfiguraciones } from '../hooks/useConfiguraciones';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, AlertTriangle, Package, MapPin, Tag, CheckCircle, Search } from 'lucide-react';

/**
 * Componente funcional que renderiza la página de inventario.
 * Gestiona el estado local para filtros, formularios y modales.
 * Carga datos iniciales de insumos, categorías y opciones de configuración.
 * Renderiza una tabla con acciones basadas en permisos de usuario (admin, supervisor).
 * @returns {JSX.Element} Elemento JSX que representa la interfaz de inventario.
 */
const Inventario = () => {
  // Hooks personalizados para lógica de inventario, retroalimentación, autenticación y búsqueda
  const { insumos, categorias, loading, fetchInsumos, fetchCategorias, createInsumo, updateInsumo } = useInventario();
  const { showToast } = useUIFeedback(); // Para mostrar notificaciones toast
  const { profile } = useAuth(); // Perfil del usuario actual (rol, permisos)
  const { globalQuery } = useSearch(); // Consulta de búsqueda global (desde barra principal)
  const { fetchOpciones, getOpcionesPorCategoria } = useConfiguraciones(); // Para obtener opciones de configuración (unidades, bodegas)
  
  // Efecto para cargar opciones de configuración iniciales (unidades de medida y bodegas)
  useEffect(() => {
    fetchOpciones('unidad_insumo'); // Carga opciones de unidad de medida
    fetchOpciones('bodega_insumo'); // Carga opciones de ubicación física (bodegas)
  }, []);

  // Opciones de unidades de medida: obtiene de configuración o usa valores por defecto
  const unidadesMedida = getOpcionesPorCategoria('unidad_insumo').length > 0
    ? getOpcionesPorCategoria('unidad_insumo')
    : [
        { id: 'u1', clave: 'unidad', valor: 'Unidad' },
        { id: 'u2', clave: 'caja', valor: 'Caja' },
        { id: 'u3', clave: 'kg', valor: 'Kilogramo' },
        { id: 'u4', clave: 'litro', valor: 'Litro' },
        { id: 'u5', clave: 'metro', valor: 'Metro' },
        { id: 'u6', clave: 'par', valor: 'Par' },
        { id: 'u7', clave: 'set', valor: 'Set' }
      ];

  // Opciones de bodegas/ubicaciones físicas: obtiene de configuración o usa valores por defecto
  const bodegasFisicas = getOpcionesPorCategoria('bodega_insumo').length > 0
    ? getOpcionesPorCategoria('bodega_insumo')
    : [
        { id: 'b1', clave: 'bodega_principal', valor: 'Bodega Principal' },
        { id: 'b2', clave: 'bodega_auxiliar', valor: 'Bodega Auxiliar' },
        { id: 'b3', clave: 'bodega_parqueadero', valor: 'Bodega Parqueadero' }
      ];
  
  // Permisos basados en el rol del usuario
  const isAdmin = profile?.rol === 'administrador'; // True si el usuario es administrador
  const isSupervisor = profile?.rol === 'supervisor'; // True si el usuario es supervisor
  const canEditCatalog = isAdmin; // Solo administradores pueden editar el catálogo de insumos
  const canManageReturns = isSupervisor || isAdmin; // Supervisores y administradores pueden gestionar devoluciones
  
  // Estado para filtros de la tabla
  const [filtroCategoria, setFiltroCategoria] = useState(''); // Filtro por categoría
  const [filtroEstado, setFiltroEstado] = useState(''); // Filtro por estado del insumo
  const [searchQuery, setSearchQuery] = useState(''); // Búsqueda local por nombre, código o ubicación
  
  // Estado para modales y edición
  const [isModalOpen, setIsModalOpen] = useState(false); // Controla apertura del modal de crear/editar insumo
  const [insumoEditando, setInsumoEditando] = useState(null); // Insumo seleccionado para edición (null para creación)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false); // Controla apertura del modal de devolución
  const [selectedInsumo, setSelectedInsumo] = useState(null); // Insumo seleccionado para devolución
  const [cantidadRetorno, setCantidadRetorno] = useState(1); // Cantidad a devolver (mínimo 1)
  
  // Estado del formulario para crear/editar insumo
  const [formData, setFormData] = useState({
    nombre: '', // Nombre comercial/descriptivo del insumo
    categoria_id: '', // ID de la categoría (obligatorio)
    descripcion: '', // Notas adicionales (opcional)
    unidad: 'unidad', // Unidad de medida (valor por defecto: 'unidad')
    cantidad_total: 0, // Stock total en inventario
    cantidad_disponible: 0, // Stock disponible para uso
    cantidad_minima: 0, // Stock mínimo seguro (para alertas)
    ubicacion: 'Bodega Principal', // Ubicación física (valor por defecto)
    estado: 'disponible', // Estado actual: disponible, en_uso, mantenimiento, dado_de_baja
    codigo_interno: '' // Código interno/SKU (opcional)
  });

  /**
   * Abre el modal de devolución para un insumo específico.
   * @param {Object} insumo - Objeto del insumo seleccionado.
   * @returns {void}
   */
  const handleAbrirRetorno = (insumo) => {
    setSelectedInsumo(insumo); // Establece el insumo seleccionado
    setCantidadRetorno(1); // Reinicia la cantidad a 1
    setIsReturnModalOpen(true); // Abre el modal de devolución
  };

  /**
   * Confirma la devolución de un insumo, aumentando su cantidad disponible.
   * Llama a updateInsumo para actualizar la cantidad_disponible en la base de datos.
   * @returns {Promise<void>}
   */
  const handleConfirmarRetorno = async () => {
    if (selectedInsumo && cantidadRetorno > 0) {
      // Calcula la nueva cantidad disponible sumando la cantidad devuelta
      await updateInsumo(selectedInsumo.id, {
        cantidad_disponible: selectedInsumo.cantidad_disponible + parseInt(cantidadRetorno)
      });
      setIsReturnModalOpen(false); // Cierra el modal después de la actualización
    }
  };

  // Efecto para cargar datos iniciales de insumos y categorías
  useEffect(() => {
    fetchInsumos(); // Obtiene la lista de insumos del backend
    fetchCategorias(); // Obtiene las categorías disponibles
  }, []);

  // Lista filtrada de insumos según categoría, estado y búsquedas (local y global)
  const insumosFiltrados = insumos.filter(i => {
    const matchCat = filtroCategoria ? i.categorias_insumo?.nombre === filtroCategoria : true;
    const matchEstado = filtroEstado ? i.estado === filtroEstado : true;
    
    const queryLocal = searchQuery.toLowerCase();
    const queryGlobal = globalQuery.toLowerCase();
    
    // Función auxiliar para verificar si el insumo coincide con una consulta de búsqueda
    const matches = (q) => {
        if (!q) return true;
        return i.nombre.toLowerCase().includes(q) ||
               i.codigo_interno?.toLowerCase().includes(q) ||
               i.ubicacion?.toLowerCase().includes(q);
    };
      
    return matchCat && matchEstado && matches(queryLocal) && matches(queryGlobal);
  });

  /**
   * Abre el modal para crear o editar un insumo.
   * @param {Object|null} insumo - Objeto del insumo a editar (null para crear nuevo).
   * @returns {void}
   */
  const handleOpenModal = (insumo = null) => {
    if (insumo) {
      // Modo edición: carga los datos del insumo en el formulario
      setInsumoEditando(insumo);
      setFormData({
        nombre: insumo.nombre,
        categoria_id: insumo.categoria_id,
        descripcion: insumo.descripcion || '',
        unidad: insumo.unidad,
        cantidad_total: insumo.cantidad_total,
        cantidad_disponible: insumo.cantidad_disponible,
        cantidad_minima: insumo.cantidad_minima,
        ubicacion: insumo.ubicacion || '',
        estado: insumo.estado,
        codigo_interno: insumo.codigo_interno || ''
      });
    } else {
      // Modo creación: inicializa formulario con valores por defecto
      setInsumoEditando(null);
      setFormData({
        nombre: '', categoria_id: categorias[0]?.id || '', descripcion: '', unidad: 'unidad',
        cantidad_total: 0, cantidad_disponible: 0, cantidad_minima: 5,
        ubicacion: 'Bodega Principal', estado: 'disponible', codigo_interno: ''
      });
    }
    setIsModalOpen(true); // Abre el modal
  };

  /**
   * Maneja el envío del formulario para crear o actualizar un insumo.
   * Limpia campos de texto vacíos a null para evitar violaciones de integridad.
   * Llama a createInsumo o updateInsumo según el modo.
   * @param {Event} e - Evento de submit del formulario.
   * @returns {Promise<void>}
   */
  const handleSave = async (e) => {
    e.preventDefault();
    
    // Limpiar campos de texto vacíos a null para evitar violaciones de clave única/restricciones
    const payload = {
      ...formData,
      codigo_interno: formData.codigo_interno.trim() || null,
      descripcion: formData.descripcion.trim() || null,
      ubicacion: formData.ubicacion.trim() || null,
    };

    let result;
    if (insumoEditando) {
      // Actualizar insumo existente
      result = await updateInsumo(insumoEditando.id, payload);
    } else {
      // Crear nuevo insumo
      result = await createInsumo(payload);
    }

    if (result && !result.success) {
      showToast(`Error al guardar insumo: ${result.error}`, 'error');
    } else {
      showToast(insumoEditando ? 'Insumo actualizado correctamente.' : 'Insumo creado correctamente.', 'success');
      setIsModalOpen(false); // Cierra el modal después de guardar
    }
  };

  // Definición de columnas para la tabla de inventario
  const columns = [
    { header: 'ID / Código', render: (row) => (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          {row.codigo_interno || 'S/C'} {/* Muestra código interno o 'Sin Código' */}
        </span>
    )},
    { header: 'Activo / Insumo', render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.assetThumb}><Package size={16} color="var(--primary)" /></div>
          <div>
            <span style={{fontWeight: 600, display: 'block'}}>{row.nombre}</span>
            <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px'}}>
              <Tag size={10} /> {row.categorias_insumo?.nombre} {/* Muestra categoría del insumo */}
            </span>
          </div>
        </div>
      )
    },
    { header: 'Disponibilidad', render: (row) => {
        // Lógica de cálculo de inventario crítico: compara disponible con mínimo seguro
        const isLow = row.cantidad_disponible <= row.cantidad_minima;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: isLow ? 'var(--danger)' : 'inherit' }}>
              {row.cantidad_disponible} <span style={{fontWeight: 400, color: 'var(--text-muted)'}}>/ {row.cantidad_total} {row.unidad}</span>
            </span>
            {/* Icono de alerta si el inventario está por debajo del mínimo */}
            {isLow && <AlertTriangle size={16} color="var(--danger)" title="Inventario por debajo del mínimo" />}
          </div>
        );
      }
    },
    { header: 'Bodega / Ubicación', render: (row) => (
        <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={12} color="var(--text-muted)" /> {row.ubicacion || 'Sin definir'}
        </span>
    )},
    { header: 'Estado', render: (row) => <Badge variant={row.estado}>{row.estado}</Badge> }, {/* Muestra badge con color según estado */}
  ];

  // Agregar columna de acciones solo si el usuario tiene permisos
  if (canEditCatalog || canManageReturns) {
    columns.push({
      header: 'Acciones', render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Botón de editar: solo visible para administradores */}
          {canEditCatalog && (
            <button onClick={() => handleOpenModal(row)} className="btn-outline" style={{ padding: '0.5rem' }} title="Modificar insumo">
              <Edit2 size={16} />
            </button>
          )}
          {/* Botón de devolución: visible para supervisores y administradores */}
          {canManageReturns && (
            <button 
              onClick={() => handleAbrirRetorno(row)} 
              className="btn-outline" 
              style={{ padding: '0.5rem', color: 'var(--success)' }} 
              title="Registrar Devolución"
            >
              <CheckCircle size={16} />
            </button>
          )}
        </div>
      )
    });
  }

  // Renderizado principal de la página de inventario
  return (
    <div className="fade-in">
      {/* Encabezado de la página con título y botón de crear (solo para administradores) */}
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Inventario General</h1>
          <p style={{ color: 'var(--text-muted)' }}>Lista maestra de activos y recursos del salón social.</p>
        </div>
        {canEditCatalog && (
          <button onClick={() => handleOpenModal()} className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
            <Plus size={18} /> Registrar Nuevo Activo
          </button>
        )}
      </div>

      {/* Barra de filtros y búsqueda */}
      <div style={styles.filtersBar} className="card">
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar localmente..." 
              className="input-control" 
              style={{ paddingLeft: '38px', margin: 0 }} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} // Actualiza búsqueda local
            />
          </div>

          {/* Selector de categoría */}
          <select className="input-control" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={{ width: '220px', margin: 0 }}>
            <option value="">Todas las Categorías</option>
            {categorias.map(c => (
              <option key={c.id} value={c.nombre}>{c.nombre}</option>
            ))}
          </select>
          
          {/* Selector de estado */}
          <select className="input-control" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ width: '200px', margin: 0 }}>
            <option value="">Filtro por Estado</option>
            <option value="disponible">Disponible</option>
            <option value="en_uso">En Uso</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="dado_de_baja">Dado de baja</option>
          </select>
        </div>
      </div>

      {/* Tabla de inventario con indicador de carga */}
      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <div style={styles.loadingBox}>Sincronizando inventario con la base de datos...</div>
        ) : (
          <Table columns={columns} data={insumosFiltrados} itemsPerPage={10} />
        )}
      </div>

      {/* Modal para crear/editar insumo (solo visible para administradores) */}
      {canEditCatalog && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={insumoEditando ? 'Actualizar Información Técnica' : 'Nuevo Registro de Insumo'}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
            {/* Campos de nombre y código */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ flex: '1 1 200px', margin: 0 }}>
                <label>Nombre Comercial / Descriptivo</label>
                <input type="text" className="input-control" required placeholder="Ej: Sillas Plásticas Blancas" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="input-group" style={{ flex: '0 1 150px', margin: 0 }}>
                <label>ID / SKU</label>
                <input type="text" className="input-control" placeholder="ABC-001" value={formData.codigo_interno} onChange={e => setFormData({...formData, codigo_interno: e.target.value})} />
              </div>
            </div>

            {/* Campo de descripción */}
            <div className="input-group" style={{ margin: 0 }}>
              <label>Notas Adicionales (Opcional)</label>
              <textarea className="input-control" placeholder="Detalles de marca, modelo o estado..." value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} rows={2}></textarea>
            </div>

            {/* Campos de categoría y estado */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
               <div className="input-group" style={{ flex: '1 1 200px', margin: 0 }}>
                <label>Categoría</label>
                <select className="input-control" required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})}>
                  <option value="">Selecciona una...</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ flex: '1 1 200px', margin: 0 }}>
                <label>Estado Actual</label>
                <select className="input-control" required value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})}>
                  <option value="disponible">Disponible para Reserva</option>
                  <option value="en_uso">En Uso Actual</option>
                  <option value="mantenimiento">Fuera por Mantenimiento</option>
                  <option value="dado_de_baja">Dado de baja definitiva</option>
                </select>
              </div>
            </div>

            {/* Campos de cantidades (stock) */}
            <div style={{...styles.countsBox, gap: '1.5rem', flexWrap: 'wrap'}}>
              <div className="input-group" style={{ flex: '1 1 100px', margin: 0 }}>
                <label>Stock Total</label>
                <input type="number" className="input-control" required min="0" value={formData.cantidad_total} onChange={e => setFormData({...formData, cantidad_total: parseInt(e.target.value)})} />
              </div>
              <div className="input-group" style={{ flex: '1 1 100px', margin: 0 }}>
                <label>Disponible</label>
                <input type="number" className="input-control" required min="0" value={formData.cantidad_disponible} onChange={e => setFormData({...formData, cantidad_disponible: parseInt(e.target.value)})} />
              </div>
              <div className="input-group" style={{ flex: '1 1 100px', margin: 0 }}>
                <label>Mín. Seguro</label>
                <input type="number" className="input-control" required min="0" value={formData.cantidad_minima} onChange={e => setFormData({...formData, cantidad_minima: parseInt(e.target.value)})} />
              </div>
            </div>

            {/* Campos de unidad y ubicación */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ flex: '1 1 200px', margin: 0 }}>
                <label>Unidad de Medida</label>
                <select className="input-control" required value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})}>
                  <option value="">Selecciona unidad...</option>
                  {unidadesMedida.map(u => (
                    <option key={u.id} value={u.clave}>{u.valor}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ flex: '1 1 200px', margin: 0 }}>
                <label>Ubicación Física</label>
                <select className="input-control" required value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})}>
                  <option value="">Selecciona bodega...</option>
                  {bodegasFisicas.map(b => (
                    <option key={b.id} value={b.valor}>{b.valor}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botones de acción del modal */}
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Cancelar</button>
              <button type="submit" className="btn-primary" style={{ minWidth: '150px' }}>
                {insumoEditando ? 'Aplicar Cambios' : 'Confirmar Registro'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Modal de Devolución: permite registrar devolución de insumos al inventario */}
      {isReturnModalOpen && (
        <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)}>
          <div style={{ padding: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1E293B' }}>Registrar Devolución</h2>
            <p style={{ marginBottom: '1.5rem', color: '#64748B' }}>
              ¿Cuántas unidades de <strong>{selectedInsumo?.nombre}</strong> se están devolviendo al inventario?
            </p>
            
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Cantidad</label>
              <input 
                type="number" 
                className="input-control" 
                min="1"
                value={cantidadRetorno} 
                onChange={e => setCantidadRetorno(parseInt(e.target.value))} // Actualiza cantidad a devolver
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setIsReturnModalOpen(false)} className="btn-outline">Cancelar</button>
              <button onClick={handleConfirmarRetorno} className="btn-primary" style={{ backgroundColor: 'var(--success)' }}>
                Confirmar Ingreso
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Estilos en línea para mantener coherencia con el diseño del proyecto
const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  filtersBar: { padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', marginBottom: '0.5rem', borderRadius: '12px' },
  assetThumb: { backgroundColor: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px', display: 'flex' },
  loadingBox: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)' },
  countsBox: { display: 'flex', gap: '1rem', backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: '10px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }
};

export default Inventario;
