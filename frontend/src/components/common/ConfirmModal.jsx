import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmModal - Reusable confirmation modal component
 * Used for destructive actions like delete, approve, reject, etc.
 * 
 * Usage:
 *   const [deleteTarget, setDeleteTarget] = useState(null);
 *   <ConfirmModal
 *     open={!!deleteTarget}
 *     onClose={() => setDeleteTarget(null)}
 *     onConfirm={confirmDelete}
 *     title="Delete Resource"
 *     message="Are you sure you want to delete this resource?"
 *     confirmLabel="Delete"
 *     confirmVariant="danger"
 *     loading={deleting}
 *   />
 */
const ConfirmModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirm', 
  confirmVariant = 'danger', // 'danger', 'primary', 'warning'
  loading = false 
}) => {
  if (!open) return null;

  const getConfirmButtonClasses = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600';
      case 'primary':
        return 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-500 dark:bg-violet-500 dark:hover:bg-violet-600';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600';
      default:
        return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600';
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop - removed motion wrapper */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          
          {/* Modal - removed motion wrapper */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-500/10 rounded-lg">
                  <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-zinc-600 dark:text-zinc-400">
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClasses()}`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {confirmLabel}...
                  </div>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;