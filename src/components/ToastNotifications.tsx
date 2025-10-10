/**
 * ToastNotifications
 * Provide a simple global toast system for user feedback.
 *  One provider wraps the app; toasts auto-dismiss after duration.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import './ToastNotifications.css';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          <div className={`toast-icon toast-icon--${toast.type}`}></div>
          <div className="toast-message">{toast.message}</div>
          <button className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Close notification">×</button>
        </div>
      ))}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Universal toast creation method with consistent behavior.
   * Centralizes duration management and automatic cleanup logic.
   */
  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration: number = 4000) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    // Schedule automatic removal to prevent toast accumulation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error', 6000), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning', 5000), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};
