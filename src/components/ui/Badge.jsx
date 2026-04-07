/**
 * Badge.jsx
 * ─────────────────────────────────────────────────────────
 * Componente UI para etiquetas de estado o perfiles.
 * 
 * Aplica estilos de "semáforo" (colores semánticos) basados en el
 * texto o categoría que recibe por props.
 * 
 * Variantes soportadas:
 *  - Perfiles: administrador (azul), supervisor (verde), residente (gris).
 *  - Estados Usuario: activo (verde), inactivo (rojo).
 *  - Estados Insumo: disponible (verde), en_uso (amarillo), mantenimiento (naranja), dado_de_baja (rojo).
 */

import React from 'react';

const Badge = ({ children, variant = 'default' }) => {
  // Definición de colores por defecto
  let colors = {
    bg: 'var(--bg)',
    text: 'var(--text)'
  };

  // Lógica de colores según la variante (normalizada a minúsculas)
  const v = variant?.toLowerCase();

  switch (v) {
    case 'success':
    case 'activo':
    case 'disponible':
    case 'supervisor':
      // Estilo Verde (Positivo/Activo)
      colors = { bg: '#D1FAE5', text: '#065F46' };
      break;
    case 'warning':
    case 'en_uso':
      // Estilo Amarillo (Pendiente/En proceso)
      colors = { bg: '#FEF3C7', text: '#92400E' };
      break;
    case 'danger':
    case 'inactivo':
    case 'dado_de_baja':
    case 'ocupado':
      // Estilo Rojo (Error/Inactivo/Crítico)
      colors = { bg: '#FEE2E2', text: '#991B1B' };
      break;
    case 'info':
    case 'administrador':
      // Estilo Azul (Información/Privilegiado)
      colors = { bg: '#DBEAFE', text: '#1E40AF' };
      break;
    case 'mantenimiento':
      // Estilo Naranja (Atención técnica)
      colors = { bg: '#FFEDD5', text: '#9A3412' };
      break;
    case 'residente':
    default:
      // Estilo Gris (Neutro)
      colors = { bg: '#F1F5F9', text: '#475569' };
      break;
  }

  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'capitalize',
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  );
};

export default Badge;
