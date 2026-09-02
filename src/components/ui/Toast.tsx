'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, 'id'>) => string;
  success: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      type,
      title,
      description,
      duration = 4500,
    }: Omit<ToastItem, 'id'>) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, description, duration };
      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ type: 'success', title, description }),
    [toast]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      toast({ type: 'info', title, description }),
    [toast]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ type: 'warning', title, description }),
    [toast]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      toast({ type: 'error', title, description }),
    [toast]
  );

  return (
    <ToastContext.Provider
      value={{ toast, success, info, warning, error, dismiss }}
    >
      {children}
      {/* Fixed Toast Stack Viewport */}
      <aside
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
};

const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      border: 'border-emerald-500/40',
      shadow: 'shadow-[0_0_25px_rgba(0,255,157,0.25)]',
      progressBg: 'bg-emerald-400',
    },
    info: {
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />,
      border: 'border-cyan-500/40',
      shadow: 'shadow-[0_0_25px_rgba(0,240,255,0.25)]',
      progressBg: 'bg-cyan-400',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      border: 'border-amber-500/40',
      shadow: 'shadow-[0_0_25px_rgba(251,191,36,0.25)]',
      progressBg: 'bg-amber-400',
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
      border: 'border-rose-500/40',
      shadow: 'shadow-[0_0_25px_rgba(255,0,122,0.25)]',
      progressBg: 'bg-rose-400',
    },
  };

  const config = typeConfig[toast.type];

  return (
    <div
      role="status"
      className={`pointer-events-auto relative overflow-hidden rounded-xl bg-[#090B10]/95 backdrop-blur-2xl border ${config.border} ${config.shadow} p-4 text-slate-100 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5`}
    >
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1 pr-2">
          <h4 className="text-sm font-semibold tracking-tight">{toast.title}</h4>
          {toast.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-dismiss Countdown Indicator Bar */}
      {toast.duration && toast.duration > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 ${config.progressBg} opacity-80`}
          style={{
            width: '100%',
            animation: `toastCountdown ${toast.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
};

export default ToastProvider;
