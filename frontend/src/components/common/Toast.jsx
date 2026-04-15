import React, { useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

/**
 * Toast notification component.
 *
 * Usage:
 *   const [toast, setToast] = useState(null);
 *   <Toast toast={toast} onClose={() => setToast(null)} />
 *
 * Trigger: setToast({ type: 'success' | 'error', message: '...' })
 */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  const isSuccess = toast?.type === 'success';

  return (
    <AnimatePresence>
      {toast && (
        <Motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl shadow-lg border px-4 py-3 max-w-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
        >
          {isSuccess ? (
            <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          )}
          <p className="text-sm text-zinc-700 dark:text-zinc-200 flex-1">{toast.message}</p>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ml-1 shrink-0"
          >
            <X size={14} />
          </button>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
