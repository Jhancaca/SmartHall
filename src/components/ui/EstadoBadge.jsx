/**
 * EstadoBadge.jsx
 * ─────────────────────────────────────────────────────────
 * Componente para mostrar el estado de una reserva con colores semáforo.
 * 
 * Estados:
 *  - pendiente (amarillo #F59E0B)
 *  - aprobada (verde #10B981)
 *  - rechazada (rojo #EF4444)
 *  - cancelada (gris #64748B)
 */

const EstadoBadge = ({ estado }) => {
    const colores = {
        pendiente: { bg: '#FEF3C7', text: '#92400E', label: 'Pendiente' },
        aprobada: { bg: '#D1FAE5', text: '#065F46', label: 'Aprobada' },
        rechazada: { bg: '#FEE2E2', text: '#991B1B', label: 'Rechazada' },
        cancelada: { bg: '#E2E8F0', text: '#334155', label: 'Cancelada' }
    };

    const config = colores[estado] || colores.pendiente;

    return (
        <span
            style={{
                display: 'inline-block',
                padding: '0.375rem 0.75rem',
                backgroundColor: config.bg,
                color: config.text,
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500'
            }}
        >
            {config.label}
        </span>
    );
};

export default EstadoBadge;
