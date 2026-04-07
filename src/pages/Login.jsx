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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorVisible, setErrorVisible] = useState(''); // Manejo de errores de credenciales
  const { signIn } = useAuth();
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
    <div style={styles.container}>
      {/* PANEL IZQUIERDO: Formulario de Entrada */}
      <div style={styles.leftPanel}>
        <div style={styles.formContainer} className="fade-in">
          
          {/* Logo y Branding */}
          <div style={styles.brand}>
            <div style={styles.logoSquare}>
              <Building2 color="white" size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>SmartHall</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESIDENTIAL CONCIERGE</p>
            </div>
          </div>

          {/* Textos de Bienvenida */}
          <h2 style={styles.title}>¡Hola de nuevo!</h2>
          <p style={styles.subtitle}>Ingresa tus detalles para acceder a tu residencia.</p>

          {/* Alerta de Error (si existe) */}
          {errorVisible && (
            <div style={styles.errorAlert}>
              {errorVisible}
            </div>
          )}

          {/* Formulario de Inicio de Sesión */}
          <form onSubmit={handleLogin} style={styles.form}>
            <div className="input-group">
              <label>CORREO ELECTRÓNICO</label>
              <input 
                type="email" 
                className="input-control" 
                placeholder="ejemplo@smarthall.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>CONTRASEÑA</label>
                <a href="#" style={styles.forgotPass}>¿Olvidaste tu contraseña?</a>
              </div>
              <input 
                type="password" 
                className="input-control" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={styles.submitBtn}>
              Acceder a mi Dashboard <ArrowRight size={18} />
            </button>
          </form>

          {/* Pie del Formulario */}
          <p style={styles.footerText}>
            ¿Problemas de acceso? <br />
            <a href="#" style={{ color: 'var(--primary)', fontWeight: 600 }}>Contacta a Administración</a>
          </p>
        </div>
      </div>

      {/* PANEL DERECHO: Imagen o Degradado Decorativo */}
      <div style={styles.rightPanel}>
        <div style={styles.rightContent}>
          <div style={styles.quoteCard}>
            <p style={styles.quote}>
              "Descubre la comodidad de una vida integrada con los servicios de concierge de SmartHall: desde la gestión de insumos hasta reservas de espacios premium."
            </p>
            <div style={styles.divider}></div>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, letterSpacing: '1px' }}>
              RESIDENCIAL VIVIMOSTODOS • 400 FAMILIAS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Estilos específicos para la página de Login
const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    overflow: 'hidden'
  },
  leftPanel: {
    flex: 1,
    backgroundColor: 'var(--white)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem',
  },
  formContainer: {
    width: '100%',
    maxWidth: '420px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '3rem',
  },
  logoSquare: {
    backgroundColor: 'var(--primary)',
    padding: '0.6rem',
    borderRadius: '12px',
    display: 'flex',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    marginBottom: '0.5rem',
    color: 'var(--text)'
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: '2.5rem',
    fontSize: '0.95rem'
  },
  errorAlert: {
    backgroundColor: '#FEF2F2',
    color: 'var(--danger)',
    padding: '1rem',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    border: '1px solid #FEE2E2',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  forgotPass: {
    fontSize: '0.75rem',
    color: 'var(--primary)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  submitBtn: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: '10px',
    fontSize: '1rem',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)',
  },
  footerText: {
    marginTop: '2.5rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6
  },
  rightPanel: {
    flex: 1.2,
    background: 'linear-gradient(135deg, #2563EB 0%, #172554 100%)', // Gradiente Premium Azul Oscuro
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    padding: '4rem',
    position: 'relative'
  },
  rightContent: {
    maxWidth: '500px',
    zIndex: 2
  },
  quoteCard: {
    textAlign: 'center'
  },
  quote: {
    fontSize: '1.5rem',
    fontWeight: 400,
    fontStyle: 'italic',
    lineHeight: 1.6,
    marginBottom: '2rem'
  },
  divider: {
    width: '60px',
    height: '4px',
    backgroundColor: '#60A5FA',
    margin: '0 auto 1.5rem auto',
    borderRadius: '2px'
  }
};

export default Login;
