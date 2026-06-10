/**
 * Usuarios.jsx
 * ─────────────────────────────────────────────────────────
 * Página de gestión de usuarios para el sistema SmartHall.
 * 
 * Propósito:
 * - Administra la lista de usuarios (residentes, personal, administradores) con operaciones CRUD.
 * - Permite crear, editar, activar/desactivar usuarios y filtrar la lista por perfil, estado o búsqueda.
 * 
 * Hooks y APIs utilizados:
 * - useUsuarios: Hook personalizado que proporciona funciones para obtener, crear y actualizar usuarios.
 * - useSearch: Contexto global para búsqueda integrada en toda la aplicación.
 * - useState, useEffect: Hooks de React para manejo de estado y efectos secundarios.
 * 
 * Componentes y dependencias:
 * - Table: Componente de tabla para mostrar la lista de usuarios con paginación.
 * - Badge: Indicadores visuales para estado y perfil.
 * - Modal: Diálogo modal para formularios de creación/edición.
 * - Iconos de lucide-react: Plus, Edit2, UserX, UserCheck, Search.
 * 
 * Flujo de creación de usuario:
 * 1. Se abre el modal con formulario vacío.
 * 2. Se completan datos personales, email, contraseña temporal, perfil y opcionalmente número de apartamento.
 * 3. Al enviar, se llama a createUsuario que internamente:
 *    a. Crea el usuario en la tabla de autenticación (auth.users).
 *    b. Inserta el perfil y datos adicionales en la tabla profiles.
 * 4. Se cierra el modal y se actualiza la lista.
 * 
 * Renderiza:
 * - Encabezado con título y botón de registro.
 * - Barra de filtros con búsqueda local, filtro por perfil y estado.
 * - Tabla paginada de usuarios filtrados.
 * - Modal para crear o editar usuarios.
 */

import { useState, useEffect } from 'react';
import { useUsuarios } from '../hooks/useUsuarios';
import { useSearch } from '../context/SearchContext';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, UserX, UserCheck, Search } from 'lucide-react';

/**
 * Componente Usuarios.
 * 
 * Renderiza la página de administración de usuarios con tabla, filtros y modal para CRUD.
 * 
 * @returns {JSX.Element} Componente de gestión de usuarios.
 */
const Usuarios = () => {
  // Hook personalizado para operaciones de usuarios (obtener, crear, actualizar)
  const { usuarios, loading, fetchUsuarios, getPerfiles, createUsuario, updateUsuario } = useUsuarios();
  // Contexto de búsqueda global para filtrado integrado
  const { globalQuery } = useSearch();

  // Estado para almacenar la lista de perfiles (roles) disponibles
  const [perfiles, setPerfiles] = useState([]);
  // Filtro por nombre de perfil
  const [filtroPerfil, setFiltroPerfil] = useState('');
  // Filtro por estado (activo/inactivo)
  const [filtroEstado, setFiltroEstado] = useState('');
  // Consulta de búsqueda local para filtrar usuarios
  const [searchQuery, setSearchQuery] = useState('');
  // Controla la visibilidad del modal de creación/edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Usuario que se está editando (null si es creación)
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  // Estado del formulario para crear o editar usuario
  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', email: '', password: '',
    perfil_id: '', numero_apto: '', telefono: '', estado: 'activo'
  });

  // Efecto para cargar usuarios y perfiles al montar el componente
  useEffect(() => {
    fetchUsuarios(); // Obtiene la lista de usuarios del backend
    getPerfiles().then(setPerfiles); // Obtiene los perfiles disponibles
  }, []);

  // Usuarios filtrados según perfil, estado y búsquedas (local y global)
  const usuariosFiltrados = usuarios.filter(u => {
    // Coincidencia por perfil seleccionado
    const matchPerfil = filtroPerfil ? u.perfiles?.nombre === filtroPerfil : true;
    // Coincidencia por estado seleccionado
    const matchEstado = filtroEstado ? u.estado === filtroEstado : true;
    
    // Normalizar consultas de búsqueda a minúsculas
    const queryLocal = searchQuery.toLowerCase();
    const queryGlobal = globalQuery.toLowerCase();
    
    // Función auxiliar para verificar si una consulta coincide con datos del usuario
    const matches = (q) => {
        if (!q) return true; // Si no hay consulta, coincide
        // Busca en nombre completo, email o número de apartamento
        return `${u.nombres} ${u.apellidos}`.toLowerCase().includes(q) ||
               u.email?.toLowerCase().includes(q) ||
               u.numero_apto?.toLowerCase().includes(q);
    };
      
    // Retorna true si cumple todos los filtros
    return matchPerfil && matchEstado && matches(queryLocal) && matches(queryGlobal);
  });

  /**
   * Abre el modal para crear o editar un usuario.
   * Si se pasa un usuario, se carga en el formulario para edición; de lo contrario, se prepara para creación.
   * 
   * @param {Object|null} usuario - Objeto usuario a editar o null para crear uno nuevo.
   */
  const handleOpenModal = (usuario = null) => {
    if (usuario) {
      // Modo edición: cargar datos del usuario en el formulario
      setUsuarioEditando(usuario);
      setFormData({
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        email: usuario.email,
        password: '', // No se muestra contraseña en edición por seguridad
        perfil_id: usuario.perfil_id,
        numero_apto: usuario.numero_apto || '',
        telefono: usuario.telefono || '',
        estado: usuario.estado
      });
    } else {
      // Modo creación: formulario vacío con valores por defecto
      setUsuarioEditando(null);
      setFormData({
        nombres: '', apellidos: '', email: '', password: '',
        perfil_id: perfiles[0]?.id || '', // Selecciona el primer perfil por defecto
        numero_apto: '', telefono: '', estado: 'activo'
      });
    }
    setIsModalOpen(true); // Mostrar el modal
  };

  /**
   * Maneja el envío del formulario para guardar un usuario (crear o actualizar).
   * En modo edición, excluye la contraseña del envío por seguridad.
   * 
   * @param {React.FormEvent} e - Evento de envío del formulario.
   */
  const handleSave = async (e) => {
    e.preventDefault(); // Prevenir recarga de página
    if (usuarioEditando) {
      // Excluir password del objeto de actualización (no se actualiza aquí)
      const { password, ...datosAActualizar } = formData;
      await updateUsuario(usuarioEditando.id, datosAActualizar); // Llama a la API para actualizar
    } else {
      // Crear nuevo usuario con todos los datos incluyendo contraseña
      await createUsuario(formData); // Internamente crea en auth.users y profiles
    }
    setIsModalOpen(false); // Cerrar modal tras operación exitosa
  };

  /**
   * Alterna el estado de un usuario entre activo e inactivo.
   * Actualiza solo el campo estado en la base de datos.
   * 
   * @param {Object} usuario - Objeto usuario cuyo estado se va a cambiar.
   */
  const toggleEstado = async (usuario) => {
    // Determinar el nuevo estado opuesto al actual
    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
    await updateUsuario(usuario.id, { estado: nuevoEstado }); // Actualiza solo el estado
  };

  // Nombre del perfil seleccionado en el formulario (para mostrar campos condicionales)
  const selectedPerfilNombre = perfiles.find(p => p.id === formData.perfil_id)?.nombre;

  // Definición de columnas para la tabla de usuarios
  const columns = [
    {
      header: 'Nombre Completo', // Muestra nombres y apellidos concatenados
      render: (row) => (
        <span style={{ fontWeight: 600 }}>{row.nombres} {row.apellidos}</span>
      )
    },
    { header: 'Correo Electrónico', accessor: 'email' }, // Acceso directo a propiedad email
    { header: 'Rol / Perfil', render: (row) => <Badge variant={row.perfiles?.nombre}>{row.perfiles?.nombre}</Badge> }, // Muestra perfil con badge
    { header: 'Apartamento', render: (row) => row.numero_apto ? `Apto ${row.numero_apto}` : '-' }, // Muestra apartamento o guion si no tiene
    { header: 'Estado', render: (row) => <Badge variant={row.estado}>{row.estado}</Badge> }, // Muestra estado con color
    {
      header: 'Acciones', // Botones de editar y activar/desactivar
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Botón para abrir modal de edición */}
          <button onClick={() => handleOpenModal(row)} className="btn-outline" style={{ padding: '0.5rem' }} title="Editar">
            <Edit2 size={16} />
          </button>
          {/* Botón para alternar estado del usuario */}
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

  // Renderizado principal de la página de gestión de usuarios
  return (
    <div className="fade-in">
      {/* Encabezado con título y botón de registro */}
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>Gestión de Usuarios</h1>
          <p style={{ color: 'var(--text-muted)' }}>Panel administrativo de residentes y personal de SmartHall.</p>
        </div>
        {/* Botón para abrir modal de creación de usuario */}
        <button onClick={() => handleOpenModal()} className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
          <Plus size={18} /> Registrar Nuevo Usuario
        </button>
      </div>

      {/* Barra de filtros con búsqueda y selects */}
      <div style={styles.filtersBar} className="card">
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          {/* Campo de búsqueda local */}
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

          {/* Select para filtrar por perfil */}
          <select className="input-control" value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)} style={{ width: '180px', margin: 0 }}>
            <option value="">Todos los Perfiles</option>
            {perfiles.map(p => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>

          {/* Select para filtrar por estado */}
          <select className="input-control" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ width: '180px', margin: 0 }}>
            <option value="">Todos los Estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Sección de tabla o indicador de carga */}
      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <div style={styles.loadingBox}>Cargando lista de usuarios...</div>
        ) : (
          <Table columns={columns} data={usuariosFiltrados} itemsPerPage={8} />
        )}
      </div>

      {/* Modal para crear o editar usuario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={usuarioEditando ? 'Actualizar Información de Usuario' : 'Registrar Nuevo Integrante'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Campos de nombres y apellidos */}
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

          {/* Campo de email (deshabilitado en edición) */}
          <div className="input-group" style={{ margin: 0 }}>
            <label>Correo Electrónico Corporativo / Personal</label>
            <input type="email" className="input-control" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={!!usuarioEditando} />
          </div>

          {/* Campo de contraseña solo en creación */}
          {!usuarioEditando && (
            <div className="input-group" style={{ margin: 0 }}>
              <label>Definir Contraseña Temporal</label>
              <input type="password" className="input-control" required={!usuarioEditando} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
          )}

          {/* Campos de perfil y teléfono */}
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

          {/* Campo condicional: apartamento solo para residentes */}
          {selectedPerfilNombre === 'residente' && (
            <div className="input-group" style={{ margin: 0 }} >
              <label>Apartamento de Residencia</label>
              <input type="text" className="input-control" required placeholder="Ej: Torre 1 - 402" value={formData.numero_apto} onChange={e => setFormData({ ...formData, numero_apto: e.target.value })} />
            </div>
          )}

          {/* Botones de acción del modal */}
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

// Estilos inline para elementos de la interfaz
const styles = {
  // Estilo del encabezado: flex para alinear título y botón
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  // Estilo de la barra de filtros: card con padding y bordes redondeados
  filtersBar: { padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', marginBottom: '0.5rem', borderRadius: '12px' },
  // Estilo del cuadro de carga: centrado con borde y fondo
  loadingBox: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)' },
  // Estilo de las acciones del modal: alineación a la derecha con separador
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }
};

export default Usuarios;
