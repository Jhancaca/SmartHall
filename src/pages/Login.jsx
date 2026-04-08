/**
 * Login.jsx
 * ─────────────────────────────────────────────────────────
 * Pantalla de Acceso a SmartHall.
 * 
 * Implementa una interfaz de dos columnas:
 *  - Izquierda: Formulario de inicio de sesión con validaciones básicas.
 *  - Derecha: Panel decorativo (gradiente) con mensaje de bienvenida.
 * 
 * Utiliza el método `signIn` del AuthContext para validar contra Supabase Auth.
 */

// Importaciones de React y React Router
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Importaciones del Contexto de Autenticación
import { useAuth } from '../context/AuthContext';
// Componentes visuales e iconos
import { Building2, ArrowRight } from 'lucide-react';
// Importación de la hoja de estilos mapeada con CSS Modules
import styles from './Login.module.css';

const Login = () => {
  // Estado local para almacenar correo electrónico y contraseña
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Estado para el control de la visibilidad de alertas de error
  const [errorVisible, setErrorVisible] = useState(''); 
  
  // Extraemos la función de acceso desde nuestro contexto
  const { signIn } = useAuth();
  // Hook de enrutamiento para redirecciones
  const navigate = useNavigate();

  /**
   * handleLogin
   * Ejecuta el proceso de autenticación. Si es exitoso, redirige al
   * dashboard. Si falla, muestra un mensaje de error claro en la UI.
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorVisible('');
    try {
      await signIn(email, password);
      navigate('/'); // Redirección al éxito
    } catch (err) {
      setErrorVisible('Credenciales incorrectas. Verifica tu correo y contraseña.');
    }
  };

  return (
    // Contenedor principal flex
    <div className={styles.container}>
      {/* PANEL IZQUIERDO: Área interactiva - Formulario de Entrada */}
      <div className={styles.leftPanel}>
        <div className={`${styles.formContainer} fade-in`}>
          
          {/* Componente visual: Logo y Branding */}
          <div className={styles.brand}>
            <div className={styles.logoSquare}>
              <Building2 color="white" size={24} />
            </div>
            <div>
              {/* Estilos en línea mínimos conservados solo para variaciones específicas de tipografía global */}
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>SmartHall</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESIDENTIAL CONCIERGE</p>
            </div>
          </div>

          {/* Textos introductorios */}
          <h2 className={styles.title}>¡Hola de nuevo!</h2>
          <p className={styles.subtitle}>Ingresa tus detalles para acceder a tu residencia.</p>

          {/* Renderizado condicional del mensaje de error */}
          {errorVisible && (
            <div className={styles.errorAlert}>
              {errorVisible}
            </div>
          )}

          {/* Formulario que dispara el evento de inicio de sesión */}
          <form onSubmit={handleLogin} className={styles.form}>
            <div className="input-group">
              <label>CORREO ELECTRÓNICO</label>
              <input 
                type="email" 
                className="input-control" 
                placeholder="ejemplo@smarthall.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)} // Mutación del estado del correo
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>CONTRASEÑA</label>
                <a href="#" className={styles.forgotPass}>¿Olvidaste tu contraseña?</a>
              </div>
              <input 
                type="password" 
                className="input-control" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)} // Mutación del estado de la contraseña
                required
              />
            </div>

            {/* Acción principal: botón de envío */}
            <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
              Acceder a mi Dashboard <ArrowRight size={18} />
            </button>
          </form>

          {/* Información de soporte al pie del panel */}
          <p className={styles.footerText}>
            ¿Problemas de acceso? <br />
            <a href="#" style={{ color: 'var(--primary)', fontWeight: 600 }}>Contacta a Administración</a>
          </p>
        </div>
      </div>

      {/* PANEL DERECHO: Área decorativa que promueve la marca */}
      <div className={styles.rightPanel}>
        <div className={styles.rightContent}>
          <div className={styles.quoteCard}>
            <p className={styles.quote}>
              "Descubre la comodidad de una vida integrada con los servicios de concierge de SmartHall: desde la gestión de insumos hasta reservas de espacios premium."
            </p>
            {/* Separador estético */}
            <div className={styles.divider}></div>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, letterSpacing: '1px' }}>
              RESIDENCIAL VIVIMOSTODOS • 400 FAMILIAS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exportación del componente como default para el enrutado
export default Login;
