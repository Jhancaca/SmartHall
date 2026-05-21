/**
 * Inventario.jsx
 * ─────────────────────────────────────────────────────────
 * Módulo de Gestión de Insumos y Activos del Salón Social.
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

const Inventario = () => {
  const { insumos, categorias, loading, fetchInsumos, fetchCategorias, createInsumo, updateInsumo } = useInventario();
  const { showToast } = useUIFeedback();
  const { profile } = useAuth();
  const { globalQuery } = useSearch();
  const { fetchOpciones, getOpcionesPorCategoria } = useConfiguraciones();
  
  useEffect(() => {
    fetchOpciones('unidad_insumo');
    fetchOpciones('bodega_insumo');
  }, []);

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

  const bodegasFisicas = getOpcionesPorCategoria('bodega_insumo').length > 0
    ? getOpcionesPorCategoria('bodega_insumo')
    : [
        { id: 'b1', clave: 'bodega_principal', valor: 'Bodega Principal' },
        { id: 'b2', clave: 'bodega_auxiliar', valor: 'Bodega Auxiliar' },
        { id: 'b3', clave: 'bodega_parqueadero', valor: 'Bodega Parqueadero' }
      ];
  
  const isAdmin = profile?.rol === 'administrador';
  const isSupervisor = profile?.rol === 'supervisor';
  const canEditCatalog = isAdmin;
  const canManageReturns = isSupervisor || isAdmin;
  
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [cantidadRetorno, setCantidadRetorno] = useState(1);
  
  const [formData, setFormData] = useState({
    nombre: '', categoria_id: '', descripcion: '', unidad: 'unidad',
    cantidad_total: 0, cantidad_disponible: 0, cantidad_minima: 0,
    ubicacion: 'Bodega Principal', estado: 'disponible', codigo_interno: ''
  });

  const handleAbrirRetorno = (insumo) => {
    setSelectedInsumo(insumo);
    setCantidadRetorno(1);
    setIsReturnModalOpen(true);
  };

  const handleConfirmarRetorno = async () => {
    if (selectedInsumo && cantidadRetorno > 0) {
      await updateInsumo(selectedInsumo.id, {
        cantidad_disponible: selectedInsumo.cantidad_disponible + parseInt(cantidadRetorno)
      });
      setIsReturnModalOpen(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
    fetchCategorias();
  }, []);

  const insumosFiltrados = insumos.filter(i => {
    const matchCat = filtroCategoria ? i.categorias_insumo?.nombre === filtroCategoria : true;
    const matchEstado = filtroEstado ? i.estado === filtroEstado : true;
    
    const queryLocal = searchQuery.toLowerCase();
    const queryGlobal = globalQuery.toLowerCase();
    
    const matches = (q) => {
        if (!q) return true;
        return i.nombre.toLowerCase().includes(q) ||
               i.codigo_interno?.toLowerCase().includes(q) ||
               i.ubicacion?.toLowerCase().includes(q);
    };
      
    return matchCat && matchEstado && matches(queryLocal) && matches(queryGlobal);
  });

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
        ubicacion: 'Bodega Principal', estado: 'disponible', codigo_interno: ''
      });
    }
    setIsModalOpen(true);
  };

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
      result = await updateInsumo(insumoEditando.id, payload);
    } else {
      result = await createInsumo(payload);
    }

    if (result && !result.success) {
      showToast(`Error al guardar insumo: ${result.error}`, 'error');
    } else {
      showToast(insumoEditando ? 'Insumo actualizado correctamente.' : 'Insumo creado correctamente.', 'success');
      setIsModalOpen(false);
    }
  };

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

  if (canEditCatalog || canManageReturns) {
    columns.push({
      header: 'Acciones', render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canEditCatalog && (
            <button onClick={() => handleOpenModal(row)} className="btn-outline" style={{ padding: '0.5rem' }} title="Modificar insumo">
              <Edit2 size={16} />
            </button>
          )}
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

  return (
    <div className="fade-in">
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

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
      </div>

      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <div style={styles.loadingBox}>Sincronizando inventario con la base de datos...</div>
        ) : (
          <Table columns={columns} data={insumosFiltrados} itemsPerPage={10} />
        )}
      </div>

      {canEditCatalog && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={insumoEditando ? 'Actualizar Información Técnica' : 'Nuevo Registro de Insumo'}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
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

            <div className="input-group" style={{ margin: 0 }}>
              <label>Notas Adicionales (Opcional)</label>
              <textarea className="input-control" placeholder="Detalles de marca, modelo o estado..." value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} rows={2}></textarea>
            </div>

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

            <div style={styles.modalActions}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Cancelar</button>
              <button type="submit" className="btn-primary" style={{ minWidth: '150px' }}>
                {insumoEditando ? 'Aplicar Cambios' : 'Confirmar Registro'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Modal de Devolución */}
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
                onChange={e => setCantidadRetorno(parseInt(e.target.value))}
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

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  filtersBar: { padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', marginBottom: '0.5rem', borderRadius: '12px' },
  assetThumb: { backgroundColor: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px', display: 'flex' },
  loadingBox: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)' },
  countsBox: { display: 'flex', gap: '1rem', backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: '10px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }
};

export default Inventario;
