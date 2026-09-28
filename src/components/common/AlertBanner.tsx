import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppErrorType } from '@/types/network';

export interface AlertBannerProps {
  type?: 'error' | 'warning' | 'info' | 'success';
  errorType?: AppErrorType;
  title: string;
  message?: string;
  actionHint?: string;
  onClose?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'error',
  errorType,
  title,
  message,
  actionHint,
  onClose,
  className,
}) => {
  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
  };

  const bgStyles = {
    error: 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200',
    info: 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        className={cn(
          'relative p-4 rounded-xl border backdrop-blur-md flex items-start gap-3 shadow-lg',
          bgStyles[type],
          className
        )}
      >
        {icons[type]}
        <div className="flex-1 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <span>{title}</span>
            {errorType && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                {errorType}
              </span>
            )}
          </div>
          {message && <p className="mt-1 opacity-90 leading-relaxed text-xs sm:text-sm">{message}</p>}
          {actionHint && (
            <p className="mt-1.5 text-xs font-medium opacity-80 underline underline-offset-2">
              💡 {actionHint}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 shrink-0"
            aria-label="Dismiss error notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
