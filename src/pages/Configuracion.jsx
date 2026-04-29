/**
 * Configuracion.jsx
 * ─────────────────────────────────────────────────────────
 * Panel de administración para gestionar configuraciones dinámicas.
 */

import React, { useState, useEffect } from 'react';
import { useConfiguraciones } from '../hooks/useConfiguraciones';
import { supabase } from '../lib/supabase';
import { Settings, Plus, Edit2, Trash2, Save, X, Layers, Ruler, UserCheck, Activity, AlertTriangle, Tag } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const Configuracion = () => {
  const { opciones, loading, fetchOpciones, crearOpcion, actualizarOpcion, eliminarOpcion } = useConfiguraciones();
  const [opcionesInsumo, setOpcionesInsumo] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ categoria: '', clave: '', valor: '', orden: 0 });

  useEffect(() => {
    fetchOpciones();
    const loadInsumoCats = async () => {
      const { data } = await supabase.from('categorias_insumo').select('*').order('nombre');
      if (data) setOpcionesInsumo(data);
    };
    loadInsumoCats();
  }, []);

  const categorias = [
    { id: 'tipo_evento', nombre: 'Tipos de Evento', icon: Activity, desc: 'Categorías de reservas permitidas.' },
    { id: 'categoria_insumo', nombre: 'Categorías de Inventario', icon: Tag, desc: 'Clasificación de insumos y activos.' },
    { id: 'unidad_insumo', nombre: 'Unidades de Medida', icon: Ruler, desc: 'Unidades para el inventario.' },
    { id: 'rol_personal', nombre: 'Roles de Personal', icon: UserCheck, desc: 'Cargos dentro de la administración.' },
    { id: 'estado_instalacion', nombre: 'Estados de Instalación', icon: Layers, desc: 'Disponibilidad de áreas.' }
  ];

  const handleOpenModal = (opcion = null, catId = '') => {
    if (opcion) {
      setEditingId(opcion.id);
      setFormData({ ...opcion });
    } else {
      setEditingId(null);
      setFormData({ categoria: catId, clave: '', valor: '', orden: opciones.filter(o => o.categoria === catId).length + 1 });
    }
    setModalOpen(true);
  };

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

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [idAEliminar, setIdAEliminar] = useState(null);
    const [catAEliminar, setCatAEliminar] = useState(null);

    const handleConfirmarEliminacion = (id, cat) => {
        setIdAEliminar(id);
        setCatAEliminar(cat);
        setConfirmDeleteOpen(true);
    };

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

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Configuración del Sistema</h1>
          <p style={styles.subtitle}>Gestiona las listas dinámicas y valores maestros de SmartHall.</p>
        </div>
        <Settings size={32} color="var(--primary)" />
      </header>

      <div style={styles.grid}>
        {categorias.map(cat => (
          <div key={cat.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIconTitle}>
                <cat.icon size={20} color="var(--primary)" />
                <h3 style={styles.cardTitle}>{cat.nombre}</h3>
              </div>
              <button 
                onClick={() => handleOpenModal(null, cat.id)} 
                style={styles.addButton}
                title="Añadir opción"
              >
                <Plus size={16} />
              </button>
            </div>
            <p style={styles.cardDesc}>{cat.desc}</p>
            
            <div style={styles.list}>
              {(cat.id === 'categoria_insumo' ? opcionesInsumo : opciones.filter(o => o.categoria === cat.id)).length === 0 ? (
                <p style={styles.empty}>No hay opciones definidas.</p>
              ) : (
                (cat.id === 'categoria_insumo' 
                  ? opcionesInsumo.map(o => ({ id: o.id, valor: o.nombre, categoria: 'categoria_insumo' })) 
                  : opciones.filter(o => o.categoria === cat.id)
                ).map(opc => (
                  <div key={opc.id} style={styles.listItem}>
                    <span>{opc.valor}</span>
                    <div style={styles.actions}>
                      <button onClick={() => handleOpenModal(opc)} style={styles.actionBtn}>
                        <Edit2 size={14} />
                      </button>
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

      {/* Modal de Edición/Creación */}
      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>{editingId ? 'Editar Opción' : 'Nueva Opción'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Valor Visible</label>
                <input 
                  style={styles.input}
                  required
                  value={formData.valor}
                  onChange={e => setFormData({...formData, valor: e.target.value, clave: e.target.value.toLowerCase().replace(/ /g, '_')})}
                  placeholder="Ej: Cumpleaños, Caja, etc."
                />
              </div>
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

      {/* Modal de Confirmación de Eliminación */}
      {confirmDeleteOpen && (
        <Modal isOpen={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
          <div style={styles.modalContent}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
              <button onClick={ejecutarEliminacion} style={{...styles.btnPrimario, backgroundColor: '#EF4444'}}>Eliminar Permanentemente</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

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
  empty: { textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' },
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
