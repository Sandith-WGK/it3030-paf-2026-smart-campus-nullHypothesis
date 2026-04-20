import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading,
}) {
  const confirmStyles = {
    primary:
      'bg-violet-600 hover:bg-violet-700 text-white',
    danger:
      'bg-red-600 hover:bg-red-700 text-white',
    warning:
      'bg-amber-500 hover:bg-amber-600 text-white',
  };


  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-amber-100 dark:bg-amber-500/10 p-2">
                <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </h2>
            </div>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold py-2 disabled:opacity-60 transition-colors ${confirmStyles[confirmVariant]}`}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
