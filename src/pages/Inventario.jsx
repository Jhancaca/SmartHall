/**
 * Inventario.jsx
 * ─────────────────────────────────────────────────────────
 * Módulo de Gestión de Insumos y Activos del Salón Social.
 * 
 * Funcionalidades principales:
 *  - Carga listado maestro de insumos (sillas, mesas, luces, etc.).
 *  - Control de stock con alertas visuales de nivel mínimo.
 *  - Gestión CRUD restringida por roles (Admin/Supervisor editan, Residente lee).
 *  - Categorización y estados de mantenimiento.
 */

import { useState, useEffect } from 'react';
import { useInventario } from '../hooks/useInventario';
import { useAuth } from '../context/AuthContext';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, AlertTriangle, Package, MapPin, Tag } from 'lucide-react';

const Inventario = () => {
  // Inicialización de Hooks (Insumos + Sesión)
  const { insumos, categorias, loading, fetchInsumos, fetchCategorias, createInsumo, updateInsumo } = useInventario();
  const { profile } = useAuth();
  
  // Permisos: Solo admin y supervisor pueden realizar cambios
  const canEdit = profile?.rol === 'administrador' || profile?.rol === 'supervisor';
  
  // Estados de control de UI
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState(null);
  
  // Estado inicial del formulario
  const [formData, setFormData] = useState({
    nombre: '', categoria_id: '', descripcion: '', unidad: 'unidad',
    cantidad_total: 0, cantidad_disponible: 0, cantidad_minima: 0,
    ubicacion: '', estado: 'disponible', codigo_interno: ''
  });

  // Ejecución al montar el componente
  useEffect(() => {
    fetchInsumos();
    fetchCategorias();
  }, []);

  // Filtrado reactivo en UI
  const insumosFiltrados = insumos.filter(i => {
    const matchCat = filtroCategoria ? i.categorias_insumo?.nombre === filtroCategoria : true;
    const matchEstado = filtroEstado ? i.estado === filtroEstado : true;
    return matchCat && matchEstado;
  });

  /**
   * handleOpenModal
   * Muestra el modal de formulario operando sobre los estados locales.
   */
  const handleOpenModal = (insumo = null) => {
    if (insumo) {
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
      setInsumoEditando(null);
      setFormData({
        nombre: '', categoria_id: categorias[0]?.id || '', descripcion: '', unidad: 'unidad',
        cantidad_total: 0, cantidad_disponible: 0, cantidad_minima: 5,
        ubicacion: '', estado: 'disponible', codigo_interno: ''
      });
    }
    setIsModalOpen(true);
  };

  /**
   * handleSave
   * Procesa la inserción o actualización de la data en Supabase.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    if (insumoEditando) {
      await updateInsumo(insumoEditando.id, formData);
    } else {
      await createInsumo(formData);
    }
    setIsModalOpen(false);
  };

  /**
   * Configuración de la Tabla de Inventario
   */
  const columns = [
    { header: 'ID / Código', render: (row) => (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          {row.codigo_interno || 'S/C'}
        </span>
    )},
    { header: 'Activo / Insumo', render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.assetThumb}><Package size={16} color="var(--primary)" /></div>
          <div>
            <span style={{fontWeight: 600, display: 'block'}}>{row.nombre}</span>
            <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px'}}>
              <Tag size={10} /> {row.categorias_insumo?.nombre}
            </span>
          </div>
        </div>
      )
    },
    { header: 'Disponibilidad', render: (row) => {
        // Alerta si el stock disponible es menor o igual al mínimo definido
        const isLow = row.cantidad_disponible <= row.cantidad_minima;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: isLow ? 'var(--danger)' : 'inherit' }}>
              {row.cantidad_disponible} <span style={{fontWeight: 400, color: 'var(--text-muted)'}}>/ {row.cantidad_total} {row.unidad}</span>
            </span>
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
    { header: 'Estado', render: (row) => <Badge variant={row.estado}>{row.estado}</Badge> },
  ];

  // Columna de acciones solo para privilegiados
  if (canEdit) {
    columns.push({
      header: 'Acciones', render: (row) => (
        <button onClick={() => handleOpenModal(row)} className="btn-outline" style={{ padding: '0.5rem' }} title="Modificar insumo">
          <Edit2 size={16} />
        </button>
      )
    });
  }

  return (
    <div className="fade-in">
      {/* Header del Inventario */}
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Inventario General</h1>
          <p style={{ color: 'var(--text-muted)' }}>Lista maestra de activos y recursos del salón social.</p>
        </div>
        {canEdit && (
          <button onClick={() => handleOpenModal()} className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
            <Plus size={18} /> Registrar Nuevo Activo
          </button>
        )}
      </div>

      {/* Barra de Filtros de Inventario */}
      <div style={styles.filtersBar} className="card">
        <select className="input-control" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={{ width: '220px', margin: 0 }}>
          <option value="">Todas las Categorías</option>
          {categorias.map(c => (
             <option key={c.id} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>
        
        <select className="input-control" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ width: '200px', margin: 0 }}>
          <option value="">Filtro por Estado</option>
          <option value="disponible">Disponible</option>
          <option value="en_uso">En Uso</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="dado_de_baja">Dado de baja</option>
        </select>
      </div>

      {/* Grid / Tabla Central */}
      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <div style={styles.loadingBox}>Sincronizando inventario con la base de datos...</div>
        ) : (
          <Table columns={columns} data={insumosFiltrados} itemsPerPage={10} />
        )}
      </div>

      {/* Modal de Formulario de Inventario */}
      {canEdit && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={insumoEditando ? 'Actualizar Información Técnica' : 'Nuevo Registro de Insumo'}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Fila: Nombre y Código */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Nombre Comercial / Descriptivo</label>
                <input type="text" className="input-control" required placeholder="Ej: Sillas Plásticas Blancas" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="input-group" style={{ width: '150px', margin: 0 }}>
                <label>ID / SKU</label>
                <input type="text" className="input-control" placeholder="ABC-001" value={formData.codigo_interno} onChange={e => setFormData({...formData, codigo_interno: e.target.value})} />
              </div>
            </div>

            {/* Descripción Técnica */}
            <div className="input-group" style={{ margin: 0 }}>
              <label>Notas Adicionales (Opcional)</label>
              <textarea className="input-control" placeholder="Detalles de marca, modelo o estado..." value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} rows={2}></textarea>
            </div>

            {/* Fila: Categoría y Estado de Gestión */}
            <div style={{ display: 'flex', gap: '1rem' }}>
               <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Categoría</label>
                <select className="input-control" required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})}>
                  <option value="">Selecciona una...</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Estado Actual</label>
                <select className="input-control" required value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})}>
                  <option value="disponible">Disponible para Reserva</option>
                  <option value="en_uso">En Uso Actual</option>
                  <option value="mantenimiento">Fuera por Mantenimiento</option>
                  <option value="dado_de_baja">Dado de baja definitiva</option>
                </select>
              </div>
            </div>

            {/* Bloque de Cantidades (Números) */}
            <div style={styles.countsBox}>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Stock Total</label>
                <input type="number" className="input-control" required min="0" value={formData.cantidad_total} onChange={e => setFormData({...formData, cantidad_total: parseInt(e.target.value)})} />
              </div>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Disponible</label>
                <input type="number" className="input-control" required min="0" value={formData.cantidad_disponible} onChange={e => setFormData({...formData, cantidad_disponible: parseInt(e.target.value)})} />
              </div>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Mín. Seguro</label>
                <input type="number" className="input-control" required min="0" value={formData.cantidad_minima} onChange={e => setFormData({...formData, cantidad_minima: parseInt(e.target.value)})} />
              </div>
            </div>

            {/* Fila: Unidad y Bodega */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Unidad de Medida</label>
                <select className="input-control" required value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})}>
                  <option value="unidad">Unidad Individual</option>
                  <option value="caja">Caja / Lote</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="litro">Litros (L)</option>
                  <option value="set">Set / Conjunto</option>
                </select>
              </div>
              <div className="input-group" style={{ flex: 1.5, margin: 0 }}>
                <label>Ubicación Física</label>
                <input type="text" className="input-control" placeholder="Ej: Bodega Central A-1" value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})} />
              </div>
            </div>

            {/* Acciones de Footer del Formulario */}
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Cancelar</button>
              <button type="submit" className="btn-primary" style={{ minWidth: '150px' }}>
                {insumoEditando ? 'Aplicar Cambios' : 'Confirmar Registro'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// Estilos internos de Inventario
const styles = {
  header: {
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '2rem'
  },
  filtersBar: {
    padding: '1rem 1.5rem',
    display: 'flex',
    gap: '1rem',
    marginBottom: '0.5rem',
    borderRadius: '12px'
  },
  assetThumb: {
    backgroundColor: 'var(--primary-light)',
    padding: '0.5rem',
    borderRadius: '8px',
    display: 'flex'
  },
  loadingBox: {
    padding: '4rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid var(--border)'
  },
  countsBox: {
    display: 'flex', 
    gap: '1rem', 
    backgroundColor: 'var(--bg)', 
    padding: '1rem', 
    borderRadius: '10px'
  },
  modalActions: {
    display: 'flex', 
    justifyContent: 'flex-end', 
    gap: '1rem', 
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--border)'
  }
};

export default Inventario;
