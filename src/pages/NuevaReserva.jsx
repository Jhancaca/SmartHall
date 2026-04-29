/**
 * NuevaReserva.jsx
 * ─────────────────────────────────────────────────────────
 * Formulario para crear una nueva reserva de salón.
 * 
 * Características:
 *  - Layout: imagen del salón a la izquierda, formulario a la derecha
 *  - Validaciones frontend (48h, 90 días, 1 evento/día)
 *  - Mensajes de error inline (sin alerts)
 *  - Iconos informativos al pie
 *  - Solo admin puede crear a nombre de otro residente
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservas } from '../hooks/useReservas';
import { useUsuarios } from '../hooks/useUsuarios';
import { useAuth } from '../context/AuthContext';
import { useConfiguraciones } from '../hooks/useConfiguraciones';
import { Clock, AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';

const NuevaReserva = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const { createReserva, verificarDisponibilidad } = useReservas();
    const { usuarios, fetchUsuarios } = useUsuarios();
    const { fetchOpciones, getOpcionesPorCategoria } = useConfiguraciones();

    useEffect(() => {
        fetchOpciones('tipo_evento');
    }, []);

    const tiposEvento = getOpcionesPorCategoria('tipo_evento');

    const [formData, setFormData] = useState({
        residente_id: '', // Se inicializa vacío para obligar a seleccionar o usar el actual
        fecha_evento: '',
        hora_inicio: '12:00',
        hora_fin: '13:00',
        tipo_evento: '',
        numero_invitados: 1,
        descripcion: ''
    });

    // Asegurar que si no es admin, se use su ID
    useEffect(() => {
        if (profile?.rol !== 'administrador' && user?.id) {
            setFormData(prev => ({ ...prev, residente_id: user.id }));
        }
    }, [user, profile]);

    // Estados de validación
    const [errores, setErrores] = useState({});
    const [validacion, setValidacion] = useState({ disponible: true, mensaje: '' });

    const [guardando, setGuardando] = useState(false);
    const [exito, setExito] = useState(false);

    // Cargar lista de residentes si es admin
    useEffect(() => {
        if (profile?.rol === 'administrador') {
            fetchUsuarios();
        }
    }, [profile, fetchUsuarios]);

    // Filtrar solo residentes (o mostrar todos si es necesario)
    const residentes = (Array.isArray(usuarios) ? usuarios : []).filter(u => u.perfiles?.nombre === 'residente' || !u.perfiles);

    // Validaciones
    const calcularHorasEnAdelanto = (fecha) => {
        const ahora = new Date();
        const diaEvento = new Date(fecha);
        const horasEnAdelanto = (diaEvento - ahora) / (1000 * 60 * 60);
        return horasEnAdelanto;
    };

    const tiempoEnMinutos = (hora) => {
        if (!hora) return 0;
        const [h, m] = hora.split(':').map(Number);
        // Si h es 0 y es medianoche, y estamos validando fin, devolver 1440
        if (h === 0 && m === 0) return 1440;
        return h * 60 + m;
    };

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

        // Verificar disponibilidad en Supabase
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

    const handleChangeFecha = async (e) => {
        const fecha = e.target.value;
        setFormData({ ...formData, fecha_evento: fecha });
        await validarFecha(fecha);
    };

    const handleChangeHora = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Limpiar errores del campo modificado
        const nuevosErrores = { ...errores };
        delete nuevosErrores[name];
        delete nuevosErrores.horas;
        setErrores(nuevosErrores);
    };

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
        const maxInvitados = 400; // Podría venir de configuraciones en el futuro
        if (!formData.numero_invitados || isNaN(parseInt(formData.numero_invitados)) || parseInt(formData.numero_invitados) < 1) {
            nuevosErrores.numero_invitados = 'Debe haber al menos 1 invitado.';
        } else if (parseInt(formData.numero_invitados) > maxInvitados) {
            nuevosErrores.numero_invitados = `La capacidad máxima del salón es de ${maxInvitados} personas.`;
        }

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

    // Calcular fecha mínima (hoy + 2 días)
    const ahora = new Date();
    const fechaMin = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);
    const fechaMax = new Date(ahora.getTime() + 90 * 24 * 60 * 60 * 1000);
    const minDateStr = fechaMin.toISOString().split('T')[0];
    const maxDateStr = fechaMax.toISOString().split('T')[0];

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

                        <button
                            type="submit"
                            disabled={guardando}
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

const styles = {
    pageContainer: {
        backgroundColor: '#F8FAFC',
        minHeight: '100vh',
        padding: '2rem'
    },
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
    errorInline: {
        fontSize: '0.75rem',
        color: '#EF4444',
        marginTop: '0.25rem'
    },
    exitoInline: {
        fontSize: '0.75rem',
        color: '#10B981',
        marginTop: '0.25rem'
    },
    errorGlobal: {
        backgroundColor: '#FEE2E2',
        border: '1px solid #FECACA',
        color: '#991B1B',
        padding: '1rem',
        borderRadius: '0.375rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem'
    },
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
