import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastNotification } from '../../types';

interface ToastProps {
  toast: ToastNotification | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const config = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    },
  }[toast.type];

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-slideIn">
      <div className={`p-4 rounded-xl border shadow-lg flex items-start gap-3 ${config.bg}`}>
        {config.icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{toast.title}</p>
          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 text-slate-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
