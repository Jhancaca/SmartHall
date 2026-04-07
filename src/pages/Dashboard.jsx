/**
 * Dashboard.jsx
 * ─────────────────────────────────────────────────────────
 * Página de inicio del sistema (Escritorio).
 * 
 * Ofrece un resumen visual rápido del estado del salón:
 *  - Saludo personalizado al usuario.
 *  - Tarjetas de indicadores clave (KPIs) como estado de cuenta, 
 *    próximas reservas e insumos críticos.
 * 
 * En futuras fases, aquí se integrarán gráficos de ocupación
 * y widgets de notificaciones activas.
 */

import { useAuth } from '../context/AuthContext';
import { CreditCard, CalendarCheck, PackageSearch } from 'lucide-react';

const Dashboard = () => {
  const { profile } = useAuth();

  // Datos de ejemplo para las tarjetas (serán dinámicos en Entrega 2)
  const stats = [
    { label: 'Estado de Cuenta', value: 'Al día', icon: CreditCard, color: 'var(--success)' },
    { label: 'Próximas Reservas', value: '1', icon: CalendarCheck, color: 'var(--primary)' },
    { label: 'Insumos Críticos', value: '3', icon: PackageSearch, color: 'var(--danger)' },
  ];

  return (
    <div className="fade-in">
      {/* Cabecera del Dashboard */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text)' }}>
          ¡Bienvenido de nuevo, {profile?.nombres}!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Aquí tienes un resumen de lo que está pasando en SmartHall hoy.
        </p>
      </div>

      {/* Rejilla de Tarjetas Estadísticas */}
      <div style={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className="card" style={styles.statCard}>
            <div style={{...styles.iconBox, backgroundColor: `${stat.color}15` }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div>
              <h3 style={styles.statLabel}>{stat.label}</h3>
              <p style={{...styles.statValue, color: stat.color }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sección Informativa Inferior (Placeholder para Entrega 1) */}
      <div style={{ marginTop: '2.5rem' }} className="card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Soporte Residencial</h3>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          ¿Necesitas ayuda con el sistema o el salón social? <br /> 
          Puedes contactar al supervisor de turno o realizar una reporte de novedad 
          en el módulo de contacto próximamente disponible.
        </p>
      </div>
    </div>
  );
};

// Estilos específicos para el Dashboard
const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '2rem',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  },
  iconBox: {
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.05em',
    marginBottom: '0.25rem'
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
  }
};

export default Dashboard;
