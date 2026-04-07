/**
 * Usuarios.jsx
 * ─────────────────────────────────────────────────────────
 * Módulo de Gestión de Usuarios (Exclusivo para Administradores).
 * 
 * Permite gestionar quién tiene acceso al sistema:
 *  - Carga listado de usuarios con integración a Supabase.
 *  - Filtros dinámicos por rol (perfil) y estado (activo/inactivo).
 *  - Formulario Modal para creación de nuevos usuarios (Residentes, Supervisores, Admins).
 *  - Función para habilitar o deshabilitar cuentas sin borrarlas.
 */

import { useState, useEffect } from 'react';
import { useUsuarios } from '../hooks/useUsuarios';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, UserX, UserCheck, Search } from 'lucide-react';

const Usuarios = () => {
  // Inicialización de lógica de negocio (Hook Personalizado)
  const { usuarios, loading, fetchUsuarios, getPerfiles, createUsuario, updateUsuario } = useUsuarios();

  // Estados de control de UI
  const [perfiles, setPerfiles] = useState([]);
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', email: '', password: '',
    perfil_id: '', numero_apto: '', telefono: '', estado: 'activo'
  });

  // Carga inicial de datos
  useEffect(() => {
    fetchUsuarios();
    getPerfiles().then(setPerfiles);
  }, []);

  // Lógica de filtrado dinámico en memoria
  const usuariosFiltrados = usuarios.filter(u => {
    const matchPerfil = filtroPerfil ? u.perfiles?.nombre === filtroPerfil : true;
    const matchEstado = filtroEstado ? u.estado === filtroEstado : true;
    return matchPerfil && matchEstado;
  });

  /**
   * handleOpenModal
   * Prepara el formulario ya sea para un nuevo registro (limpio)
   * o para editar uno existente (precargado).
   */
  const handleOpenModal = (usuario = null) => {
    if (usuario) {
      setUsuarioEditando(usuario);
      setFormData({
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        email: usuario.email,
        password: '',
        perfil_id: usuario.perfil_id,
        numero_apto: usuario.numero_apto || '',
        telefono: usuario.telefono || '',
        estado: usuario.estado
      });
    } else {
      setUsuarioEditando(null);
      setFormData({
        nombres: '', apellidos: '', email: '', password: '',
        perfil_id: perfiles[0]?.id || '', numero_apto: '', telefono: '', estado: 'activo'
      });
    }
    setIsModalOpen(true);
  };

  /**
   * handleSave
   * Envía la información capturada a Supabase a través del hook.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    if (usuarioEditando) {
      const { password, ...datosAActualizar } = formData;
      await updateUsuario(usuarioEditando.id, datosAActualizar);
    } else {
      await createUsuario(formData);
    }
    setIsModalOpen(false);
  };

  /**
   * toggleEstado
   * Cambia rápidamente el estado de un usuario de activo a inactivo y viceversa.
   */
  const toggleEstado = async (usuario) => {
    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
    await updateUsuario(usuario.id, { estado: nuevoEstado });
  };

  // Helper para saber si mostrar el campo de apartamento
  const selectedPerfilNombre = perfiles.find(p => p.id === formData.perfil_id)?.nombre;

  // Configuración de columnas para el componente de Tabla
  const columns = [
    {
      header: 'Nombre Completo', render: (row) => (
        <span style={{ fontWeight: 600 }}>{row.nombres} {row.apellidos}</span>
      )
    },
    { header: 'Correo Electrónico', accessor: 'email' },
    { header: 'Rol / Perfil', render: (row) => <Badge variant={row.perfiles?.nombre}>{row.perfiles?.nombre}</Badge> },
    { header: 'Apartamento', render: (row) => row.numero_apto ? `Apto ${row.numero_apto}` : '-' },
    { header: 'Estado', render: (row) => <Badge variant={row.estado}>{row.estado}</Badge> },
    {
      header: 'Acciones', render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => handleOpenModal(row)} className="btn-outline" style={{ padding: '0.5rem' }} title="Editar">
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => toggleEstado(row)}
            className="btn-outline"
            style={{ padding: '0.5rem' }}
            title={row.estado === 'activo' ? "Desactivar acceso" : "Activar acceso"}
          >
            {row.estado === 'activo' ? <UserX size={16} color="var(--danger)" /> : <UserCheck size={16} color="var(--success)" />}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="fade-in">
      {/* Header del Módulo */}
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>Gestión de Usuarios</h1>
          <p style={{ color: 'var(--text-muted)' }}>Panel administrativo de residentes y personal de SmartHall.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
          <Plus size={18} /> Registrar Nuevo Usuario
        </button>
      </div>

      {/* Barra de Filtros */}
      <div style={styles.filtersBar} className="card">
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar por nombre..." className="input-control" style={{ paddingLeft: '38px', margin: 0 }} />
          </div>

          <select className="input-control" value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)} style={{ width: '180px', margin: 0 }}>
            <option value="">Todos los Perfiles</option>
            {perfiles.map(p => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>

          <select className="input-control" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ width: '180px', margin: 0 }}>
            <option value="">Todos los Estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Tabla de Datos */}
      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <div style={styles.loadingBox}>Cargando lista de usuarios...</div>
        ) : (
          <Table columns={columns} data={usuariosFiltrados} itemsPerPage={8} />
        )}
      </div>

      {/* Modal de Formulario (Creación/Edición) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={usuarioEditando ? 'Actualizar Información de Usuario' : 'Registrar Nuevo Integrante'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Fila: Nombres y Apellidos */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 1, margin: 0 }}>
              <label>Nombres</label>
              <input type="text" className="input-control" required value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} />
            </div>
            <div className="input-group" style={{ flex: 1, margin: 0 }}>
              <label>Apellidos</label>
              <input type="text" className="input-control" required value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} />
            </div>
          </div>

          {/* Email (Solo lectura si se edita) */}
          <div className="input-group" style={{ margin: 0 }}>
            <label>Correo Electrónico Corporativo / Personal</label>
            <input type="email" className="input-control" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={!!usuarioEditando} />
          </div>

          {/* Password (Solo nueva creación) */}
          {!usuarioEditando && (
            <div className="input-group" style={{ margin: 0 }}>
              <label>Definir Contraseña Temporal</label>
              <input type="password" className="input-control" required={!usuarioEditando} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
          )}

          {/* Fila: Perfil y Teléfono */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 1, margin: 0 }}>
              <label>Perfil de Acceso</label>
              <select className="input-control" required value={formData.perfil_id} onChange={e => setFormData({ ...formData, perfil_id: e.target.value })}>
                <option value="">Selecciona un rol...</option>
                {perfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="input-group" style={{ flex: 1, margin: 0 }}>
              <label>Número Celular</label>
              <input type="text" className="input-control" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
            </div>
          </div>

          {/* Campo Condicional: Apartamento (Solo para residentes) */}
          {selectedPerfilNombre === 'residente' && (
            <div className="input-group" style={{ margin: 0 }} >
              <label>Apartamento de Residencia</label>
              <input type="text" className="input-control" required placeholder="Ej: Torre 1 - 402" value={formData.numero_apto} onChange={e => setFormData({ ...formData, numero_apto: e.target.value })} />
            </div>
          )}

          {/* Acciones de Footer de Modal */}
          <div style={styles.modalActions}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Descartar</button>
            <button type="submit" className="btn-primary" style={{ minWidth: '150px' }}>
              {usuarioEditando ? 'Guardar Cambios' : 'Confirmar Registro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Estilos específicos para Usuarios
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
    alignItems: 'center',
    marginBottom: '0.5rem',
    borderRadius: '12px'
  },
  loadingBox: {
    padding: '4rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid var(--border)'
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

export default Usuarios;
