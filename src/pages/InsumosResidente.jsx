/**
 * @fileoverview Página de catálogo de insumos para residentes.
 *
 * Esta página permite a los residentes explorar el inventario disponible de insumos
 * (sillas, mesas, equipo de audio, etc.) y solicitar préstamos vinculados a sus
 * reservas de eventos previamente aprobadas.
 *
 * ## Flujo general del residente:
 * 1. El residente ve el catálogo de insumos disponibles con su stock actual.
 * 2. Puede filtrar por nombre o categoría para encontrar lo que necesita.
 * 3. Al hacer clic en "Solicitar Préstamo", se abre un modal.
 * 4. El residente selecciona una de sus reservas aprobadas y la cantidad deseada.
 * 5. El sistema valida stock y reserva antes de enviar la solicitud.
 * 6. La solicitud queda pendiente de confirmación por parte del administrador.
 *
 * ## Hooks utilizados:
 * - `useAuth` — obtiene el usuario autenticado actual.
 * - `useInventario` — gestiona la carga de insumos y categorías del inventario.
 * - `useReservas` — carga las reservas del residente para vincular al préstamo.
 * - `usePrestamos` — maneja la creación de solicitudes de préstamo y su historial.
 *
 * ## Componentes externos:
 * - `Modal` — componente reutilizable de ventana modal.
 * - Iconos de `lucide-react` (Search, Filter, Package, Calendar, Info, AlertCircle, CheckCircle).
 *
 * @returns {JSX.Element} Página completa del catálogo de insumos con grid de tarjetas y modal de solicitud.
 */

import { useState, useEffect } from 'react';
import { useInventario } from '../hooks/useInventario';
import { useReservas } from '../hooks/useReservas';
import { useAuth } from '../context/AuthContext';
import { usePrestamos } from '../hooks/usePrestamos';
import Modal from '../components/ui/Modal';
import { Search, Filter, Package, Calendar, Info, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Componente principal de la página de catálogo de insumos para residentes.
 *
 * Renderiza una barra de búsqueda y filtros, un grid responsivo de tarjetas
 * con los insumos disponibles, y un modal para realizar solicitudes de préstamo
 * vinculadas a reservas aprobadas.
 *
 * @component
 * @returns {JSX.Element} Página del catálogo de insumos con funcionalidad de solicitud.
 */
const InsumosResidente = () => {
    // ─── Hooks de contexto y datos ────────────────────────────────────
    /** Usuario autenticado actual (contiene id, nombre, etc.) */
    const { user } = useAuth();

    /** Insumos del inventario, categorías y estado de carga */
    const { insumos, categorias, loading, fetchInsumos, fetchCategorias } = useInventario();

    /** Reservas del residente actual (se filtran las aprobadas para solicitudes) */
    const { reservas, fetchReservas } = useReservas();

    /** Funciones para crear préstamos y obtener historial de préstamos */
    const { solicitarPrestamo, prestamos, fetchPrestamos } = usePrestamos();

    // ─── Estado: Filtros y Búsqueda ───────────────────────────────────
    /** Texto de búsqueda para filtrar insumos por nombre */
    const [searchQuery, setSearchQuery] = useState('');

    /** ID de categoría seleccionada para filtrar insumos; cadena vacía = todas */
    const [categoriaFiltro, setCategoriaFiltro] = useState('');

    // ─── Estado: Modal de Solicitud de Préstamo ───────────────────────
    /** Controla la apertura/cierre del modal de solicitud */
    const [isModalAbierto, setIsModalAbierto] = useState(false);

    /** Insumo seleccionado actualmente para solicitar (objeto completo del inventario) */
    const [insumoSeleccionado, setInsumoSeleccionado] = useState(null);

    /** ID de la reserva seleccionada para vincular al préstamo */
    const [reservaId, setReservaId] = useState('');

    /** Cantidad de unidades a solicitar del insumo */
    const [cantidad, setCantidad] = useState(1);

    /** Mensaje de error de validación o del servidor */
    const [error, setError] = useState('');

    /** Indica si se está procesando la solicitud (deshabilita botones) */
    const [procesando, setProcesando] = useState(false);

    /** Mensaje de éxito mostrado tras enviar la solicitud correctamente */
    const [mensajeExito, setMensajeExito] = useState('');

    /**
     * Efecto de inicialización: carga los datos necesarios al montar el componente.
     * Obtiene el inventario completo, las categorías y las reservas del usuario actual.
     * Se ejecuta una sola vez al montar (dependencias vacías).
     */
    useEffect(() => {
        fetchInsumos();
        fetchCategorias();
        fetchReservas(user?.id);
    }, []);

    /**
     * Abre el modal de solicitud de préstamo para un insumo específico.
     * Reinicia todos los campos del formulario (reserva, cantidad, errores, éxito)
     * y establece el insumo seleccionado.
     *
     * @param {Object} insumo - Objeto del insumo seleccionado del catálogo.
     * @param {string} insumo.id - Identificador único del insumo.
     * @param {string} insumo.nombre - Nombre del insumo.
     * @param {number} insumo.cantidad_disponible - Stock disponible actual.
     */
    const handleAbrirSolicitud = (insumo) => {
        setInsumoSeleccionado(insumo);
        setReservaId('');
        setCantidad(1);
        setError('');
        setMensajeExito('');
        setIsModalAbierto(true);
    };

    /**
     * Procesa y envía la solicitud de préstamo al servidor.
     *
     * Flujo:
     * 1. Valida que se haya seleccionado una reserva.
     * 2. Valida que la cantidad solicitada no exceda el stock disponible.
     * 3. Llama a `solicitarPrestamo` con los datos del formulario.
     * 4. En caso de éxito, muestra mensaje de confirmación y actualiza el stock visual.
     * 5. En caso de error, muestra el mensaje de error devuelto por el servidor.
     * 6. Cierra el modal automáticamente tras 2.5 segundos si fue exitoso.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; gestiona estado interno del componente.
     */
    const handleSolicitar = async () => {
        setError('');
        if (!reservaId) {
            setError('Debes seleccionar una reserva vinculada.');
            return;
        }

        if (cantidad > insumoSeleccionado.cantidad_disponible) {
            setError(`No hay suficiente stock. Disponibles: ${insumoSeleccionado.cantidad_disponible}`);
            return;
        }

        setProcesando(true);
        const res = await solicitarPrestamo({
            reserva_id: reservaId,
            insumo_id: insumoSeleccionado.id,
            cantidad: cantidad
        });

        if (res.success) {
            setMensajeExito('¡Solicitud enviada! Espera a que el administrador la confirme.');
            fetchInsumos(); // Actualizar stock visual
            setTimeout(() => {
                setIsModalAbierto(false);
            }, 2500);
        } else {
            setError(res.error);
        }
        setProcesando(false);
    };

    /**
     * Lista de insumos filtrados según la búsqueda por nombre y la categoría seleccionada.
     * Se usa para renderizar únicamente los insumos que coinciden con los filtros activos.
     * @type {Array<Object>}
     */
    const insumosFiltrados = insumos.filter(i => {
        const matchesSearch = i.nombre.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = categoriaFiltro ? i.categoria_id === categoriaFiltro : true;
        return matchesSearch && matchesCat;
    });

    /**
     * Reservas del residente con estado 'aprobada'.
     * Solo las reservas aprobadas pueden vincularse a una solicitud de préstamo.
     * Se usa tanto para el dropdown del modal como para validar si el usuario puede solicitar.
     * @type {Array<Object>}
     */
    const reservasAptas = reservas.filter(r => r.estado === 'aprobada');

    return (
        <div style={styles.container}>
            {/* ─── Encabezado de la página ────────────────────────────── */}
            <header style={styles.header}>
                <div>
                    <h1 style={styles.titulo}>Catálogo de Insumos</h1>
                    <p style={styles.subtitulo}>Explora y solicita equipos para tus eventos aprobados.</p>
                </div>
            </header>

            {/* ─── Barra de herramientas: búsqueda y filtros ───────────── */}
            <div style={styles.toolbar}>
                <div style={styles.searchBox}>
                    <Search size={18} color="#94A3B8" />
                    <input 
                        type="text" 
                        placeholder="Buscar sillas, mesas..." 
                        style={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div style={styles.filterBox}>
                    <Filter size={18} color="#94A3B8" />
                    <select 
                        style={styles.select}
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                    >
                        <option value="">Todas las categorías</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={styles.loading}>Cargando catálogo...</div>
            ) : insumosFiltrados.length === 0 ? (
                <div style={styles.empty}>No se encontraron insumos con esos filtros.</div>
            ) : (
                <div style={styles.grid}>
                    {insumosFiltrados.map(i => (
                        <div key={i.id} style={styles.card}>
                            <div style={styles.cardIcon}>
                                <Package size={32} color="#6366F1" />
                            </div>
                            <div style={styles.cardContent}>
                                <h3 style={styles.insumoNombre}>{i.nombre}</h3>
                                <p style={styles.insumoCat}>{i.categorias_insumo?.nombre || 'General'}</p>
                                {/* Badge con stock disponible y unidad de medida */}
                                <div style={styles.stockBadge}>
                                    <span>Disponibles: <strong>{i.cantidad_disponible}</strong> {i.unidad}</span>
                                </div>
                                {/* Botón deshabilitado si no hay stock disponible */}
                                <button 
                                    onClick={() => handleAbrirSolicitud(i)}
                                    disabled={i.cantidad_disponible <= 0}
                                    style={{
                                        ...styles.btnSolicitar,
                                        backgroundColor: i.cantidad_disponible > 0 ? '#6366F1' : '#CBD5E1'
                                    }}
                                >
                                    {i.cantidad_disponible > 0 ? 'Solicitar Préstamo' : 'Agotado'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Solicitud */}
            {isModalAbierto && insumoSeleccionado && (
                <Modal isOpen={isModalAbierto} onClose={() => setIsModalAbierto(false)}>
                    <div style={styles.modalContenido}>
                        <h2 style={styles.modalTitulo}>Solicitar {insumoSeleccionado.nombre}</h2>
                        <p style={styles.modalSub}>Completa los datos para vincular este préstamo a tu reserva.</p>

                        {/* Si hay mensaje de éxito, se muestra banner y se oculta el formulario */}
                        {mensajeExito ? (
                            <div style={styles.successBanner}>
                                <CheckCircle size={20} />
                                <span>{mensajeExito}</span>
                            </div>
                        ) : (
                            <>
                                {/* Banner de error de validación o del servidor */}
                                {error && (
                                    <div style={styles.errorBanner}>
                                        <AlertCircle size={20} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Campo de selección de reserva aprobada */}
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Selecciona tu Reserva Aprobada *</label>
                                    <div style={styles.selectWrapper}>
                                        <Calendar size={18} color="#64748B" />
                                        <select 
                                            style={styles.selectForm}
                                            value={reservaId}
                                            onChange={(e) => setReservaId(e.target.value)}
                                        >
                                            <option value="">Elige una reserva...</option>
                                            {reservasAptas.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.tipo_evento} - {new Date(r.fecha_evento).toLocaleDateString()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {reservasAptas.length === 0 && (
                                        <p style={styles.helperText}>No tienes reservas aprobadas para solicitar préstamos.</p>
                                    )}
                                </div>

                                {/* Campo de cantidad con validación de stock máximo */}
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Cantidad a solicitar (Max: {insumoSeleccionado.cantidad_disponible}) *</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={insumoSeleccionado.cantidad_disponible}
                                        style={styles.input}
                                        value={cantidad}
                                        onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                                    />
                                </div>

                                {/* Nota informativa sobre el proceso de entrega */}
                                <div style={styles.infoBox}>
                                    <Info size={16} />
                                    <p>Recuerda que el supervisor debe confirmar la entrega física del equipo el día del evento.</p>
                                </div>

                                {/* Botones de acción del modal: cancelar y confirmar */}
                                <div style={styles.modalActions}>
                                    <button onClick={() => setIsModalAbierto(false)} style={styles.btnSecundario}>Cancelar</button>
                                    <button 
                                        onClick={handleSolicitar} 
                                        disabled={procesando || reservasAptas.length === 0}
                                        style={styles.btnPrimario}
                                    >
                                        {procesando ? 'Enviando...' : 'Confirmar Solicitud'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

/**
 * Estilos en línea del componente.
 * Se utiliza `StyleSheet` no disponible aquí; se define como objeto plano.
 * Incluye estilos para: contenedor, header, toolbar, grid de tarjetas,
 * modal, formularios, botones, banners de éxito/error y estados de carga.
 */
const styles = {
    container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
    header: { marginBottom: '2.5rem' },
    titulo: { fontSize: '2rem', fontWeight: '800', color: '#1E293B', margin: 0 },
    subtitulo: { color: '#64748B', fontSize: '1rem', marginTop: '0.5rem' },
    toolbar: { display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' },
    searchBox: { flex: 1, minWidth: '250px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' },
    searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#1E293B' },
    filterBox: { minWidth: '200px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' },
    select: { border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#1E293B', background: 'transparent' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
    card: { backgroundColor: '#FFFFFF', borderRadius: '1rem', border: '1px solid #E2E8F0', padding: '1.5rem', transition: 'transform 0.2s, box-shadow 0.2s', ':hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 20px -10px rgba(0,0,0,0.1)' } },
    cardIcon: { width: '64px', height: '64px', backgroundColor: '#EEF2FF', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' },
    cardContent: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    insumoNombre: { fontSize: '1.25rem', fontWeight: '700', color: '#1E293B', margin: 0 },
    insumoCat: { fontSize: '0.875rem', color: '#6366F1', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.025em' },
    stockBadge: { backgroundColor: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#475569', margin: '0.5rem 0' },
    btnSolicitar: { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', color: '#FFFFFF', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '0.5rem' },
    loading: { textAlign: 'center', padding: '5rem', color: '#64748B', fontSize: '1.1rem' },
    empty: { textAlign: 'center', padding: '5rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '1rem', border: '2px dashed #E2E8F0' },
    modalContenido: { padding: '2rem' },
    modalTitulo: { fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', margin: 0 },
    modalSub: { color: '#64748B', marginBottom: '2rem', marginTop: '0.5rem' },
    formGroup: { marginBottom: '1.5rem' },
    label: { display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' },
    selectWrapper: { display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: '#F8FAFC' },
    selectForm: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' },
    input: { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', fontSize: '1rem', outline: 'none', backgroundColor: '#F8FAFC' },
    helperText: { fontSize: '0.75rem', color: '#EF4444', marginTop: '0.5rem' },
    infoBox: { display: 'flex', gap: '0.75rem', backgroundColor: '#F0F9FF', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid #E0F2FE' },
    modalActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    btnPrimario: { backgroundColor: '#6366F1', color: '#FFFFFF', padding: '0.875rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', cursor: 'pointer' },
    btnSecundario: { backgroundColor: '#F1F5F9', color: '#475569', padding: '0.875rem', borderRadius: '0.5rem', border: 'none', fontWeight: '600', cursor: 'pointer' },
    errorBanner: { display: 'flex', gap: '0.75rem', alignItems: 'center', backgroundColor: '#FEF2F2', color: '#B91C1C', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.95rem' },
    successBanner: { display: 'flex', gap: '0.75rem', alignItems: 'center', backgroundColor: '#F0FDF4', color: '#166534', padding: '2rem', borderRadius: '0.5rem', textAlign: 'center', flexDirection: 'column' }
};

export default InsumosResidente;
