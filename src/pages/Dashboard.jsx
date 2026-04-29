/**
 * Dashboard.jsx
 * ─────────────────────────────────────────────────────────
 * Página de inicio del sistema (Escritorio).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReservas } from '../hooks/useReservas';
import { useInventario } from '../hooks/useInventario';
import { Calendar, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

const Dashboard = () => {
  const { profile } = useAuth();
  const { obtenerEstadisticasMensuales } = useReservas();
  const { obtenerInsumosCriticos } = useInventario();

  const [statsData, setStatsData] = useState({
    aprobadas: 0,
    rechazadas: 0,
    pendientes: 0,
    criticos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const resStats = await obtenerEstadisticasMensuales();
      const invStats = await obtenerInsumosCriticos();
      
      setStatsData({
        ...resStats,
        criticos: invStats
      });
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: 'Solicitudes Pendientes', value: statsData.pendientes, icon: Clock, color: '#F59E0B' },
    { label: 'Aceptadas este Mes', value: statsData.aprobadas, icon: CheckCircle, color: '#10B981' },
    { label: 'Rechazadas este Mes', value: statsData.rechazadas, icon: XCircle, color: '#EF4444' },
    { label: 'Insumos Críticos', value: statsData.criticos, icon: AlertTriangle, color: '#6366F1' },
  ];

  return (
    <div className="fade-in" style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.welcome}>¡Bienvenido de nuevo, {profile?.nombres}!</h1>
          <p style={styles.subtitle}>Aquí tienes el resumen real del salón social para este mes.</p>
        </div>
      </header>

      <div style={styles.statsGrid}>
        {cards.map((card, i) => (
          <div key={i} style={styles.card}>
            <div style={{ ...styles.iconBox, backgroundColor: `${card.color}15` }}>
              <card.icon size={24} color={card.color} />
            </div>
            <div>
              <p style={styles.cardLabel}>{card.label}</p>
              <h2 style={{ ...styles.cardValue, color: card.color }}>
                {loading ? '...' : card.value}
              </h2>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.bottomSection}>
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>Estado del Sistema</h3>
          <p style={styles.infoText}>
            Todos los datos mostrados arriba se obtienen en tiempo real de la base de datos de SmartHall. 
            Las estadísticas de reservas corresponden exclusivamente al mes en curso.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { padding: '2rem' },
  header: { marginBottom: '2.5rem' },
  welcome: { fontSize: '2rem', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { color: '#64748B', marginTop: '0.5rem', fontSize: '1rem' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  },
  iconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  cardValue: { fontSize: '1.75rem', fontWeight: '800', margin: '0.25rem 0 0 0' },
  bottomSection: { marginTop: '2.5rem' },
  infoCard: { backgroundColor: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid #E2E8F0' },
  infoTitle: { fontSize: '1.25rem', fontWeight: '700', color: '#1E293B', marginBottom: '1rem', margin: 0 },
  infoText: { color: '#64748B', lineHeight: '1.6', margin: 0 }
};

export default Dashboard;
