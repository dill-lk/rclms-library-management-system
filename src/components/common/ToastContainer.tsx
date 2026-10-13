import React from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useLibrary();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {toasts.map((toast) => {
        let borderClass = 'border-gray-200 dark:border-slate-700';
        let bgClass = 'bg-white dark:bg-slate-900';
        let icon = <Info className="w-5 h-5 text-blue-500" />;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-300 dark:border-emerald-800';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-300 dark:border-rose-800';
          icon = <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-300 dark:border-amber-800';
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-elevated border ${borderClass} ${bgClass} animate-in slide-in-from-bottom-3 duration-200`}
          >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {toast.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 break-words leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
