/**
 * UIFeedbackContext.jsx
 * ─────────────────────────────────────────────────────────
 * Sistema centralizado de notificaciones y confirmaciones de SmartHall.
 *
 * Reemplaza los diálogos nativos del navegador (alert, confirm) por
 * componentes UI premium, coherentes con el sistema de diseño.
 *
 * Expone mediante el hook `useUIFeedback()`:
 *  - showToast(message, type)  → Notificación flotante auto-cerrante
 *  - showConfirm({ title, message, onConfirm, confirmText, cancelText, type })
 *                              → Modal de confirmación con backdrop
 *
 * Tipos de toast: 'success' | 'error' | 'warning' | 'info'
 * Tipos de confirm: 'danger' | 'warning' | 'info'
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  AlertCircle,
} from 'lucide-react';

// ─── Contexto ────────────────────────────────────────────
const UIFeedbackContext = createContext(null);

// ─── Configuración de variantes ──────────────────────────
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: '#DCFCE7',
    border: '#BBF7D0',
    iconColor: '#16A34A',
    titleColor: '#14532D',
    textColor: '#166534',
    progressColor: '#16A34A',
    label: 'Éxito',
  },
  error: {
    icon: XCircle,
    bg: '#FEE2E2',
    border: '#FECACA',
    iconColor: '#DC2626',
    titleColor: '#7F1D1D',
    textColor: '#991B1B',
    progressColor: '#DC2626',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    bg: '#FEF3C7',
    border: '#FDE68A',
    iconColor: '#D97706',
    titleColor: '#78350F',
    textColor: '#92400E',
    progressColor: '#D97706',
    label: 'Advertencia',
  },
  info: {
    icon: Info,
    bg: '#EFF6FF',
    border: '#BFDBFE',
    iconColor: '#2563EB',
    titleColor: '#1E3A8A',
    textColor: '#1D4ED8',
    progressColor: '#2563EB',
    label: 'Información',
  },
};

const CONFIRM_CONFIG = {
  danger: {
    confirmBg: '#DC2626',
    confirmHover: '#B91C1C',
    confirmColor: '#FFFFFF',
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    Icon: AlertCircle,
  },
  warning: {
    confirmBg: '#D97706',
    confirmHover: '#B45309',
    confirmColor: '#FFFFFF',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    Icon: AlertTriangle,
  },
  info: {
    confirmBg: '#2563EB',
    confirmHover: '#1D4ED8',
    confirmColor: '#FFFFFF',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    Icon: Info,
  },
};

const TOAST_DURATION = 4000; // ms

// ─── Componente Individual de Toast ──────────────────────
const ToastItem = ({ toast, onRemove }) => {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);
  const intervalRef = useRef(null);

  const handleRemove = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const step = 100 / (TOAST_DURATION / 50);
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(intervalRef.current);
          handleRemove();
          return 0;
        }
        return prev - step;
      });
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [handleRemove]);

  return (
    <div
      style={{
        ...styles.toast,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        animation: exiting ? 'toastSlideOut 0.3s ease forwards' : 'toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      {/* Icono */}
      <div style={{ ...styles.toastIconWrap, color: config.iconColor }}>
        <Icon size={20} />
      </div>

      {/* Contenido */}
      <div style={styles.toastContent}>
        <p style={{ ...styles.toastTitle, color: config.titleColor }}>{config.label}</p>
        <p style={{ ...styles.toastMessage, color: config.textColor }}>{toast.message}</p>
      </div>

      {/* Botón cerrar */}
      <button
        onClick={handleRemove}
        style={{ ...styles.toastClose, color: config.iconColor }}
        title="Cerrar"
      >
        <X size={16} />
      </button>

      {/* Barra de progreso */}
      <div
        style={{
          ...styles.toastProgress,
          backgroundColor: config.progressColor,
          width: `${progress}%`,
          opacity: 0.35,
        }}
      />
    </div>
  );
};

// ─── Componente de Modal de Confirmación ─────────────────
const ConfirmModal = ({ config: confirmState, onResolve }) => {
  const typeConfig = CONFIRM_CONFIG[confirmState.type] || CONFIRM_CONFIG.danger;
  const { Icon } = typeConfig;
  const [confirmHover, setConfirmHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  if (!confirmState.visible) return null;

  return (
    <div style={styles.overlay} onClick={() => onResolve(false)}>
      <div
        style={styles.confirmModal}
        className="slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Icono central */}
        <div style={{ ...styles.confirmIconRing, backgroundColor: typeConfig.iconBg }}>
          <Icon size={28} color={typeConfig.iconColor} />
        </div>

        {/* Texto */}
        <div style={styles.confirmTextBlock}>
          <h3 style={styles.confirmTitle}>{confirmState.title}</h3>
          {confirmState.message && (
            <p style={styles.confirmMessage}>{confirmState.message}</p>
          )}
        </div>

        {/* Botones */}
        <div style={styles.confirmActions}>
          <button
            onClick={() => onResolve(false)}
            style={{
              ...styles.btnCancel,
              backgroundColor: cancelHover ? '#F1F5F9' : '#FFFFFF',
            }}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
          >
            {confirmState.cancelText || 'Cancelar'}
          </button>
          <button
            onClick={() => onResolve(true)}
            style={{
              ...styles.btnConfirm,
              backgroundColor: confirmHover ? typeConfig.confirmHover : typeConfig.confirmBg,
              color: typeConfig.confirmColor,
            }}
            onMouseEnter={() => setConfirmHover(true)}
            onMouseLeave={() => setConfirmHover(false)}
          >
            {confirmState.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Proveedor Principal ──────────────────────────────────
export const UIFeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    resolve: null,
  });

  // ── Mostrar un Toast ──
  const showToast = useCallback((message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  // ── Eliminar un Toast ──
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Mostrar confirmación (devuelve Promise<boolean>) ──
  const showConfirm = useCallback(({
    title = '¿Estás seguro?',
    message = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger',
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        visible: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve,
      });
    });
  }, []);

  // ── Resolver el modal de confirmación ──
  const handleConfirmResolve = useCallback((result) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState(prev => ({ ...prev, visible: false, resolve: null }));
  }, [confirmState]);

  return (
    <UIFeedbackContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* ── Inyección de animaciones CSS ── */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(110%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastSlideOut {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(110%); }
        }
      `}</style>

      {/* ── Contenedor de Toasts ── */}
      <div style={styles.toastContainer} aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>

      {/* ── Modal de Confirmación ── */}
      <ConfirmModal config={confirmState} onResolve={handleConfirmResolve} />
    </UIFeedbackContext.Provider>
  );
};

// ─── Hook público ─────────────────────────────────────────
export const useUIFeedback = () => {
  const ctx = useContext(UIFeedbackContext);
  if (!ctx) throw new Error('useUIFeedback debe usarse dentro de <UIFeedbackProvider>');
  return ctx;
};

// ─── Estilos ──────────────────────────────────────────────
const styles = {
  // Toast container
  toastContainer: {
    position: 'fixed',
    top: '1.25rem',
    right: '1.25rem',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
    pointerEvents: 'none',
    maxWidth: '380px',
    width: '100%',
  },
  toast: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 4px 10px -5px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    pointerEvents: 'all',
    minWidth: '300px',
  },
  toastIconWrap: {
    flexShrink: 0,
    marginTop: '1px',
  },
  toastContent: {
    flex: 1,
    minWidth: 0,
  },
  toastTitle: {
    fontSize: '0.8125rem',
    fontWeight: '700',
    marginBottom: '0.125rem',
    fontFamily: 'var(--font-family)',
  },
  toastMessage: {
    fontSize: '0.8125rem',
    fontWeight: '500',
    lineHeight: '1.4',
    fontFamily: 'var(--font-family)',
  },
  toastClose: {
    flexShrink: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'opacity 0.15s',
  },
  toastProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '3px',
    borderRadius: '0 0 0 12px',
    transition: 'width 50ms linear',
  },

  // Confirm modal
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    padding: '1rem',
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    textAlign: 'center',
  },
  confirmIconRing: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  confirmTextBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  confirmTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'var(--font-family)',
    margin: 0,
  },
  confirmMessage: {
    fontSize: '0.9rem',
    color: '#64748B',
    lineHeight: '1.55',
    fontFamily: 'var(--font-family)',
    margin: 0,
  },
  confirmActions: {
    display: 'flex',
    gap: '0.75rem',
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    transition: 'background-color 0.15s',
  },
  btnConfirm: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    transition: 'background-color 0.15s',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15)',
  },
};
