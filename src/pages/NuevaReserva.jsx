/**
 * NuevaReserva.jsx
 * ─────────────────────────────────────────────────────────
 * Página/formulario para crear una nueva reserva del salón social.
 *
 * Componente principal que permite a los residentes solicitar una reserva
 * del salón social de la copropiedad. Los administradores pueden crear
 * reservas a nombre de cualquier residente.
 *
 * Hooks y servicios utilizados:
 *  - useNavigate (react-router-dom): Navegación programática post-creación.
 *  - useAuth (AuthContext): Obtiene el usuario autenticado y su perfil.
 *  - useReservas: Servicio para crear reservas y verificar disponibilidad en Supabase.
 *  - useUsuarios: Carga la lista de residentes (solo para administradores).
 *  - useConfiguraciones: Carga las opciones de tipo de evento desde configuraciones.
 *
 * Lógica de validación:
 *  - La reserva debe solicitarse con al menos 48 horas de anticipación.
 *  - No se permiten reservas con más de 90 días de anticipación.
 *  - La hora de inicio debe estar entre 12:00 y 23:00.
 *  - La hora de fin debe ser posterior a la hora de inicio (rango 13:00 - 00:00).
 *  - Se verifica la disponibilidad de la fecha en Supabase.
 *  - Capacidad máxima: 400 invitados.
 *
 * Renderizado:
 *  - Layout de dos columnas: imagen del salón (izquierda) y formulario (derecha).
 *  - En caso de éxito, muestra pantalla de confirmación con redirección automática.
 *  - Los errores se muestran inline sin usar alert().
 *
 * @file NuevaReserva.jsx
 * @module pages/NuevaReserva
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservas } from '../hooks/useReservas';
import { useUsuarios } from '../hooks/useUsuarios';
import { useAuth } from '../context/AuthContext';
import { useConfiguraciones } from '../hooks/useConfiguraciones';
import { Clock, AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';

/**
 * Componente NuevaReserva
 *
 * Formulario completo para la creación de una nueva reserva del salón social.
 * Gestiona validaciones, disponibilidad de fecha, y envío de datos al servicio
 * de reservas. Los administradores pueden seleccionar el residente por quien
 * se realiza la reserva.
 *
 * @returns {JSX.Element} Elemento JSX que renderiza el formulario de reserva
 *   o la pantalla de confirmación tras un envío exitoso.
 */
const NuevaReserva = () => {
    /** Hook de navegación para redirigir al usuario tras crear la reserva */
    const navigate = useNavigate();

    /** Datos del usuario autenticado y su perfil (rol, id, etc.) */
    const { user, profile } = useAuth();

    /** Servicios para crear reservas y verificar disponibilidad de fechas */
    const { createReserva, verificarDisponibilidad } = useReservas();

    /** Servicio para cargar la lista de usuarios residentes (solo admin) */
    const { usuarios, fetchUsuarios } = useUsuarios();

    /** Servicio para cargar opciones de configuración por categoría */
    const { fetchOpciones, getOpcionesPorCategoria } = useConfiguraciones();

    /**
     * Efecto que carga las opciones de tipo de evento al montar el componente.
     * Consulta la tabla de configuraciones en Supabase con categoría 'tipo_evento'.
     */
    useEffect(() => {
        fetchOpciones('tipo_evento');
    }, []);

    /**
     * Lista de tipos de evento disponibles.
     * Primero intenta obtener las opciones de la tabla de configuraciones.
     * Si no hay configuraciones, usa valores por defecto predefinidos.
     * @type {Array<{id: string, valor: string}>}
     */
    const tiposEvento = getOpcionesPorCategoria('tipo_evento').length > 0
        ? getOpcionesPorCategoria('tipo_evento')
        : [
            { id: 't1', valor: 'Fiesta Infantil' },
            { id: 't2', valor: 'Reunión Social' },
            { id: 't3', valor: 'Asamblea de Copropietarios' },
            { id: 't4', valor: 'Otro' }
        ];

    /**
     * Estado del formulario con los campos de la reserva.
     * @property {string} residente_id - ID del residente que realiza la reserva (requerido solo para admin).
     * @property {string} fecha_evento - Fecha del evento en formato YYYY-MM-DD.
     * @property {string} hora_inicio - Hora de inicio del evento (formato HH:mm, rango 12:00-23:00).
     * @property {string} hora_fin - Hora de fin del evento (formato HH:mm, rango 13:00-00:00).
     * @property {string} tipo_evento - Tipo de evento seleccionado.
     * @property {number} numero_invitados - Cantidad de invitados (mínimo 1, máximo 400).
     * @property {string} descripcion - Descripción opcional del evento.
     */
    const [formData, setFormData] = useState({
        residente_id: '', // Se inicializa vacío para obligar a seleccionar o usar el actual
        fecha_evento: '',
        hora_inicio: '12:00',
        hora_fin: '13:00',
        tipo_evento: '',
        numero_invitados: 1,
        descripcion: ''
    });

    /**
     * Efecto que asigna automáticamente el ID del usuario actual al campo
     * residente_id cuando el usuario no es administrador. Esto evita que
     * un residente pueda crear reservas a nombre de otro.
     */
    useEffect(() => {
        if (profile?.rol !== 'administrador' && user?.id) {
            setFormData(prev => ({ ...prev, residente_id: user.id }));
        }
    }, [user, profile]);

    /**
     * Objeto que almacena los mensajes de error de validación por campo.
     * Las claves corresponden a los nombres de los campos del formulario.
     * @type {Object<string, string>}
     */
    const [errores, setErrores] = useState({});

    /**
     * Estado que almacena el resultado de la verificación de disponibilidad
     * de la fecha seleccionada.
     * @property {boolean} disponible - Indica si la fecha está disponible.
     * @property {string} mensaje - Mensaje descriptivo del resultado.
     */
    const [validacion, setValidacion] = useState({ disponible: true, mensaje: '' });

    /**
     * Indica si el formulario está en proceso de envío.
     * Se usa para deshabilitar el botón y mostrar feedback visual.
     * @type {boolean}
     */
    const [guardando, setGuardando] = useState(false);

    /**
     * Indica si la reserva se creó exitosamente.
     * Cuando es true, se renderiza la pantalla de confirmación.
     * @type {boolean}
     */
    const [exito, setExito] = useState(false);

    /**
     * Efecto que carga la lista de usuarios solo si el usuario actual
     * es administrador. Esto permite al admin seleccionar el residente
     * por quien se realiza la reserva.
     */
    useEffect(() => {
        if (profile?.rol === 'administrador') {
            fetchUsuarios();
        }
    }, [profile, fetchUsuarios]);

    /**
     * Lista filtrada de usuarios que son residentes.
     * Filtra por perfil 'residente' o usuarios sin perfil definido.
     * Se usa en el select de selección de residente (solo admin).
     * @type {Array<Object>}
     */
    const residentes = (Array.isArray(usuarios) ? usuarios : []).filter(u => u.perfiles?.nombre === 'residente' || !u.perfiles);

    // ──────────────────────── Funciones de validación ────────────────────────

    /**
     * Calcula la cantidad de horas entre la fecha actual y la fecha del evento.
     * Se utiliza para validar que la reserva se realice con al menos 48 horas
     * de anticipación y no más de 90 días.
     *
     * @param {string} fecha - Fecha del evento en formato ISO (YYYY-MM-DD) o Date.
     * @returns {number} Cantidad de horas de anticipación. Negativo si la fecha es en el pasado.
     */
    const calcularHorasEnAdelanto = (fecha) => {
        const ahora = new Date();
        const diaEvento = new Date(fecha);
        const horasEnAdelanto = (diaEvento - ahora) / (1000 * 60 * 60);
        return horasEnAdelanto;
    };

    /**
     * Convierte una hora en formato string "HH:mm" a su equivalente en minutos.
     * Se usa para comparar horas de inicio y fin del evento.
     * Maneja el caso especial de medianoche (00:00) como 1440 minutos
     * para que sea considerado como fin de día.
     *
     * @param {string} hora - Hora en formato "HH:mm" (ej: "14:30").
     * @returns {number} Total de minutos desde las 00:00. Devuelve 0 si no se proporciona hora.
     */
    const tiempoEnMinutos = (hora) => {
        if (!hora) return 0;
        const [h, m] = hora.split(':').map(Number);
        // Si h es 0 y es medianoche, y estamos validando fin, devolver 1440
        if (h === 0 && m === 0) return 1440;
        return h * 60 + m;
    };

    /**
     * Valida la fecha seleccionada del evento.
     * Realiza las siguientes comprobaciones:
     *  1. Verifica que la fecha no esté vacía.
     *  2. Valida que la reserva se haga con al menos 48 horas de anticipación.
     *  3. Valida que no se reserve con más de 90 días de anticipación.
     *  4. Consulta disponibilidad en Supabase mediante verificarDisponibilidad().
     *
     * Actualiza los estados de errores y validacion con el resultado.
     *
     * @param {string} fecha - Fecha del evento en formato YYYY-MM-DD.
     * @returns {Promise<boolean>} true si la fecha es válida y está disponible, false en caso contrario.
     */
    const validarFecha = async (fecha) => {
        const nuevosErrores = { ...errores };
        delete nuevosErrores.fecha_evento;

        if (!fecha) {
            nuevosErrores.fecha_evento = 'La fecha del evento es obligatoria.';
            setErrores(nuevosErrores);
            return false;
        }

        const horasEnAdelanto = calcularHorasEnAdelanto(fecha);

        if (horasEnAdelanto < 48) {
            nuevosErrores.fecha_evento = 'Las reservas deben solicitarse con al menos 48 horas de anticipación.';
            setErrores(nuevosErrores);
            setValidacion({ disponible: false, mensaje: nuevosErrores.fecha_evento });
            return false;
        }

        if (horasEnAdelanto > 90 * 24) {
            nuevosErrores.fecha_evento = 'No es posible reservar con más de 90 días de anticipación.';
            setErrores(nuevosErrores);
            setValidacion({ disponible: false, mensaje: nuevosErrores.fecha_evento });
            return false;
        }

        // Verificar disponibilidad de la fecha en Supabase.
        // Esta llamada al servicio verifica que no exista otro evento programado
        // para la misma fecha. Se pasa null como hora para verificar solo la fecha.
        const resultado = await verificarDisponibilidad(fecha, null);
        if (!resultado.disponible) {
            nuevosErrores.fecha_evento = resultado.mensaje;
            setErrores(nuevosErrores);
            setValidacion(resultado);
            return false;
        }

        setErrores(nuevosErrores);
        setValidacion({ disponible: true, mensaje: '' });
        return true;
    };

    /**
     * Handler para el campo de fecha del evento.
     * Actualiza el estado del formulario y ejecuta la validación
     * de fecha (48h mínimo, 90 días máximo, disponibilidad).
     *
     * @param {React.ChangeEvent<HTMLInputElement>} e - Evento del input de fecha.
     */
    const handleChangeFecha = async (e) => {
        const fecha = e.target.value;
        setFormData({ ...formData, fecha_evento: fecha });
        await validarFecha(fecha);
    };

    /**
     * Handler para los campos de hora (hora_inicio y hora_fin).
     * Actualiza el estado del formulario y limpia los errores
     * asociados al campo modificado y los errores generales de horas.
     *
     * @param {React.ChangeEvent<HTMLInputElement>} e - Evento del input de hora.
     */
    const handleChangeHora = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Limpiar errores del campo modificado
        const nuevosErrores = { ...errores };
        delete nuevosErrores[name];
        delete nuevosErrores.horas;
        setErrores(nuevosErrores);
    };

    /**
     * Handler genérico para campos de formulario (tipo_evento, numero_invitados,
     * descripcion, residente_id).
     * Actualiza el estado del formulario y limpia el error del campo modificado.
     *
     * @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} e - Evento del campo.
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Limpiar errores del campo modificado
        if (errores[name]) {
            const nuevosErrores = { ...errores };
            delete nuevosErrores[name];
            setErrores(nuevosErrores);
        }
    };

    /**
     * Valida todos los campos del formulario antes del envío.
     * Realiza las siguientes comprobaciones:
     *  - Para admin: verifica que se haya seleccionado un residente.
     *  - Verifica que la fecha del evento esté definida.
     *  - Verifica que el tipo de evento no esté vacío.
     *  - Valida que haya al menos 1 invitado y no más de 400.
     *  - Verifica que la hora de fin sea posterior a la hora de inicio.
     *  - Valida que la hora de inicio esté entre 12:00 y 23:00.
     *  - Valida que la hora de fin esté entre 13:00 y 00:00.
     *
     * @returns {Promise<boolean>} true si todos los campos son válidos, false si hay errores.
     */
    const validarFormulario = async () => {
        const nuevosErrores = {};

        if (profile?.rol === 'administrador' && !formData.residente_id) {
            nuevosErrores.residente_id = 'Debes seleccionar un residente.';
        }
        if (!formData.fecha_evento) {
            nuevosErrores.fecha_evento = 'La fecha del evento es obligatoria.';
        }
        if (!formData.tipo_evento.trim()) {
            nuevosErrores.tipo_evento = 'El tipo de evento es obligatorio.';
        }
        /**
         * Capacidad máxima del salón social.
         * Valor fijo por ahora, pero en el futuro podría cargarse
         * desde la tabla de configuraciones.
         */
        const maxInvitados = 400; // Podría venir de configuraciones en el futuro
        if (!formData.numero_invitados || isNaN(parseInt(formData.numero_invitados)) || parseInt(formData.numero_invitados) < 1) {
            nuevosErrores.numero_invitados = 'Debe haber al menos 1 invitado.';
        } else if (parseInt(formData.numero_invitados) > maxInvitados) {
            nuevosErrores.numero_invitados = `La capacidad máxima del salón es de ${maxInvitados} personas.`;
        }

        // Validar que la hora de fin sea posterior a la hora de inicio.
        // Se comparan en formato de minutos para manejar correctamente
        // el caso de medianoche (00:00 = 1440 minutos).
        const inicioMinutos = tiempoEnMinutos(formData.hora_inicio);
        const finMinutos = tiempoEnMinutos(formData.hora_fin);
        if (finMinutos <= inicioMinutos) {
            nuevosErrores.horas = 'La hora de fin debe ser posterior a la hora de inicio.';
        }

        // Validar rango de horas
        if (formData.hora_inicio < '12:00' || formData.hora_inicio > '23:00') {
            nuevosErrores.hora_inicio = 'Hora inicio entre 12:00 y 23:00.';
        }
        if (formData.hora_fin !== '00:00' && (formData.hora_fin < '13:00' || formData.hora_fin > '23:59')) {
            nuevosErrores.hora_fin = 'Hora fin entre 13:00 y 00:00.';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    /**
     * Handler del envío del formulario.
     * Flujo:
     *  1. Previene el comportamiento por defecto del formulario.
     *  2. Ejecuta la validación completa del formulario.
     *  3. Prepara los datos para el envío (convierte numero_invitados a entero).
     *  4. Llama a createReserva del servicio de reservas (Supabase).
     *  5. En caso de éxito, muestra pantalla de confirmación y redirige a /reservas
     *     después de 2 segundos.
     *  6. En caso de error, muestra el mensaje de error en el formulario.
     *
     * @param {React.FormEvent<HTMLFormElement>} e - Evento de submit del formulario.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrores({}); // Limpiar errores previos

        try {
            const esValido = await validarFormulario();
            if (!esValido) {
                console.warn('Formulario inválido:', errores);
                return;
            }

            setGuardando(true);
            const datosAEnviar = {
                residente_id: formData.residente_id || user?.id,
                fecha_evento: formData.fecha_evento,
                hora_inicio: formData.hora_inicio,
                hora_fin: formData.hora_fin,
                tipo_evento: formData.tipo_evento,
                numero_invitados: parseInt(formData.numero_invitados),
                descripcion: formData.descripcion
            };

            const resultado = await createReserva(datosAEnviar);

            if (!resultado.success) {
                setErrores({ submit: resultado.error });
                return;
            }

            setExito(true);
            setTimeout(() => {
                navigate('/reservas');
            }, 2000);
        } catch (err) {
            console.error('Error en handleSubmit:', err);
            setErrores({ submit: 'Ocurrió un error inesperado al procesar la reserva.' });
        } finally {
            setGuardando(false);
        }
    };

    // ────────────────── Cálculo de fechas límite para el input date ──────────────────

    /** Fecha y hora actual */
    const ahora = new Date();

    /** Fecha mínima para el selector: fecha actual + 48 horas (2 días de anticipación mínima) */
    const fechaMin = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

    /** Fecha máxima para el selector: fecha actual + 90 días (anticipación máxima) */
    const fechaMax = new Date(ahora.getTime() + 90 * 24 * 60 * 60 * 1000);

    /** Fecha mínima en formato YYYY-MM-DD para el atributo min del input date */
    const minDateStr = fechaMin.toISOString().split('T')[0];

    /** Fecha máxima en formato YYYY-MM-DD para el atributo max del input date */
    const maxDateStr = fechaMax.toISOString().split('T')[0];

    // Pantalla de confirmación: se muestra después de crear la reserva exitosamente.
    // Incluye un ícono de éxito, mensaje informativo y redirección automática.
    if (exito) {
        return (
            <div style={styles.pageContainer}>
                <div style={styles.exitoContainer}>
                    <CheckCircle size={48} color="#10B981" />
                    <h2 style={styles.exitoTitulo}>¡Reserva creada!</h2>
                    <p style={styles.exitoMensaje}>
                        Tu solicitud ha sido registrada y será revisada por los administradores.
                    </p>
                    <p style={styles.exitoDetalles}>Redirigiendo a reservas...</p>
                </div>
            </div>
        );
    }

    // ────────────────── Renderizado principal del formulario ──────────────────
    // Layout de dos columnas: imagen del salón (izquierda) y formulario (derecha).
    // El formulario contiene campos de fecha, hora, tipo de evento, invitados y descripción.
    return (
        <div style={styles.pageContainer}>
            <div style={styles.containerPrincipal}>
                <div style={styles.columnaIzquierda}>
                    <div style={styles.imagenSalon}>
                        <div style={styles.placeholderImagen}>
                            <span style={styles.textoPlaceholder}>Salón Social</span>
                            <span style={styles.subtextoPlaceholder}>Capacidad: 400 personas</span>
                        </div>
                    </div>
                </div>

                <div style={styles.columnaDerecha}>
                    <form onSubmit={handleSubmit} style={styles.formulario}>
                        <h1 style={styles.titulo}>Nueva Reserva</h1>
                        <p style={styles.subtitulo}>Solicita una reserva para el salón social</p>

                        {/* Campo de selección de residente: solo visible para administradores.
                            Permite al admin crear una reserva a nombre de cualquier residente. */}
                        {profile?.rol === 'administrador' && (
                            <div style={styles.grupoFormulario}>
                                <label style={styles.label}>Residente *</label>
                                <select
                                    name="residente_id"
                                    value={formData.residente_id}
                                    onChange={handleChange}
                                    style={styles.input}
                                >
                                    <option value="">Selecciona un residente</option>
                                    {residentes.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.nombres} {r.apellidos} ({r.numero_apto || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                                {errores.residente_id && (
                                    <span style={styles.errorInline}>{errores.residente_id}</span>
                                )}
                            </div>
                        )}

                        <div style={styles.grupoFormulario}>
                            <label style={styles.label}>Fecha del Evento *</label>
                            <input
                                type="date"
                                name="fecha_evento"
                                value={formData.fecha_evento}
                                onChange={handleChangeFecha}
                                min={minDateStr}
                                max={maxDateStr}
                                style={{
                                    ...styles.input,
                                    borderColor: errores.fecha_evento ? '#EF4444' : '#E2E8F0'
                                }}
                            />
                            {errores.fecha_evento ? (
                                <span style={styles.errorInline}>{errores.fecha_evento}</span>
                            ) : validacion.disponible && formData.fecha_evento ? (
                                <span style={styles.exitoInline}>Fecha disponible ✓</span>
                            ) : null}
                        </div>

                        <div style={styles.grupoFormulario}>
                            <label style={styles.label}>Tipo de Evento *</label>
                            <select
                                name="tipo_evento"
                                value={formData.tipo_evento}
                                onChange={handleChange}
                                style={{
                                    ...styles.input,
                                    borderColor: errores.tipo_evento ? '#EF4444' : '#E2E8F0'
                                }}
                            >
                                <option value="">Selecciona tipo de evento</option>
                                {tiposEvento.map(t => (
                                    <option key={t.id} value={t.valor}>{t.valor}</option>
                                ))}
                            </select>
                            {errores.tipo_evento && (
                                <span style={styles.errorInline}>{errores.tipo_evento}</span>
                            )}
                        </div>

                        {/* Campos de hora de inicio y fin en layout de dos columnas */}
                        <div style={styles.dosColunas}>
                            <div style={styles.grupoFormulario}>
                                <label style={styles.label}>Hora de Inicio *</label>
                                <input
                                    type="time"
                                    name="hora_inicio"
                                    value={formData.hora_inicio}
                                    onChange={handleChangeHora}
                                    min="12:00"
                                    max="23:00"
                                    style={{
                                        ...styles.input,
                                        borderColor: errores.hora_inicio ? '#EF4444' : '#E2E8F0'
                                    }}
                                />
                                {errores.hora_inicio && (
                                    <span style={styles.errorInline}>{errores.hora_inicio}</span>
                                )}
                            </div>

                            <div style={styles.grupoFormulario}>
                                <label style={styles.label}>Hora de Fin *</label>
                                <input
                                    type="time"
                                    name="hora_fin"
                                    value={formData.hora_fin}
                                    onChange={handleChangeHora}
                                    style={{
                                        ...styles.input,
                                        borderColor: errores.hora_fin ? '#EF4444' : '#E2E8F0'
                                    }}
                                />
                                {errores.hora_fin && (
                                    <span style={styles.errorInline}>{errores.hora_fin}</span>
                                )}
                            </div>
                        </div>

                        {errores.horas && (
                            <div style={{ ...styles.errorInline, marginTop: '10px' }}>
                                {errores.horas}
                            </div>
                        )}

                        <div style={styles.grupoFormulario}>
                            <label style={styles.label}>Número de Invitados *</label>
                            <input
                                type="number"
                                name="numero_invitados"
                                value={formData.numero_invitados}
                                onChange={handleChange}
                                min="1"
                                style={{
                                    ...styles.input,
                                    borderColor: errores.numero_invitados ? '#EF4444' : '#E2E8F0'
                                }}
                            />
                            {errores.numero_invitados && (
                                <span style={styles.errorInline}>{errores.numero_invitados}</span>
                            )}
                        </div>

                        <div style={styles.grupoFormulario}>
                            <label style={styles.label}>Descripción (Opcional)</label>
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                placeholder="Cuéntanos más sobre tu evento"
                                style={{
                                    ...styles.input,
                                    minHeight: '100px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {errores.submit && (
                            <div style={styles.errorGlobal}>{errores.submit}</div>
                        )}

                        {/* Botón de envío: se deshabilita mientras se guarda.
                            Muestra texto alternativo durante el proceso de envío. */}
                        <button
                            style={{
                                ...styles.botonEnviar,
                                opacity: guardando ? 0.6 : 1,
                                cursor: guardando ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {guardando ? 'Guardando...' : 'Solicitar Reserva'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ────────────────────── Estilos del componente ──────────────────────
// Estilos inline organizados por sección. Se usa el patrón de objetos
// de estilo de React para mantener coherencia con el resto del proyecto.
const styles = {
    /** Contenedor de la página completa con fondo gris claro */
    pageContainer: {
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        padding: '2rem'
    },
    /** Grid principal de dos columnas: imagen del salón a la izquierda, formulario a la derecha */
    containerPrincipal: {
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '3rem',
        alignItems: 'start'
    },
    columnaIzquierda: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    /** Contenedor de la imagen del salón con aspecto cuadrado */
    imagenSalon: {
        width: '100%',
        aspectRatio: '1',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0'
    },
    placeholderImagen: {
        width: '100%',
        height: '100%',
        backgroundColor: '#EFF6FF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#2563EB'
    },
    textoPlaceholder: {
        fontSize: '1.5rem',
        fontWeight: '600'
    },
    subtextoPlaceholder: {
        fontSize: '0.875rem',
        marginTop: '0.5rem',
        opacity: 0.8
    },
    columnaDerecha: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
    },
    /** Estilos del formulario principal */
    formulario: {
        backgroundColor: '#FFFFFF',
        borderRadius: '0.5rem',
        padding: '2rem',
        border: '1px solid #E2E8F0'
    },
    formContainer: {
        maxWidth: '720px',
        margin: '0 auto'
    },
    titulo: {
        fontSize: '1.875rem',
        fontWeight: '700',
        color: '#1E293B',
        margin: 0,
        marginBottom: '0.5rem'
    },
    subtitulo: {
        fontSize: '0.875rem',
        color: '#64748B',
        margin: 0,
        marginBottom: '1.5rem'
    },
    grupoFormulario: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '1.5rem'
    },
    /** Layout de dos columnas para campos de hora */
    dosColunas: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem'
    },
    label: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#1E293B'
    },
    /** Estilo del input de formulario */
    input: {
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid #E2E8F0',
        fontSize: '1rem',
        fontFamily: 'Inter, sans-serif',
        transition: 'border-color 0.2s',
        ':focus': {
            outline: 'none',
            borderColor: '#2563EB'
        }
    },
    /** Mensaje de error inline (texto rojo) */
    errorInline: {
        fontSize: '0.75rem',
        color: '#EF4444',
        marginTop: '0.25rem'
    },
    /** Mensaje de éxito inline (texto verde) */
    exitoInline: {
        fontSize: '0.75rem',
        color: '#10B981',
        marginTop: '0.25rem'
    },
    /** Mensaje de error global (fondo rojo claro) */
    errorGlobal: {
        backgroundColor: '#FEE2E2',
        border: '1px solid #FECACA',
        color: '#991B1B',
        padding: '1rem',
        borderRadius: '0.375rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem'
    },
    /** Botón de envío del formulario */
    botonEnviar: {
        backgroundColor: '#2563EB',
        color: '#FFFFFF',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.375rem',
        border: 'none',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        width: '100%',
        transition: 'background-color 0.2s'
    },
    /** Contenedor de la sección de información con íconos */
    infoIconos: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        backgroundColor: '#FFFFFF',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #E2E8F0'
    },
    infoItem: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start'
    },
    infoTitulo: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#1E293B',
        margin: 0
    },
    infoDescripcion: {
        fontSize: '0.75rem',
        color: '#64748B',
        margin: 0,
        marginTop: '0.25rem'
    },
    /** Contenedor de la pantalla de éxito */
    exitoContainer: {
        maxWidth: '400px',
        margin: '4rem auto',
        backgroundColor: '#FFFFFF',
        padding: '2rem',
        borderRadius: '0.5rem',
        textAlign: 'center',
        border: '1px solid #E2E8F0'
    },
    exitoTitulo: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#10B981',
        margin: '1rem 0 0.5rem 0'
    },
    exitoMensaje: {
        color: '#64748B',
        marginBottom: '1rem'
    },
    exitoDetalles: {
        fontSize: '0.875rem',
        color: '#64748B'
    }
};

export default NuevaReserva;
