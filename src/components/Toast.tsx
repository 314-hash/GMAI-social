import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = {
    success: {
      bg: 'bg-slate-900/95 border-emerald-500/50 text-emerald-300',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    },
    error: {
      bg: 'bg-slate-900/95 border-red-500/50 text-red-300',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.25)]',
    },
    info: {
      bg: 'bg-slate-900/95 border-cyan-500/50 text-cyan-300',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
      glow: 'shadow-[0_0_15px_rgba(0,240,255,0.25)]',
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${config.bg} ${config.glow}`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <span className="text-sm font-medium tracking-wide">{toast.text}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
