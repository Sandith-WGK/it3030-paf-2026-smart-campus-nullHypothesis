import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { XCircle, Loader2 } from 'lucide-react';

export default function RejectModal({ open, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters');
      return;
    }
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Dialog */}
          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-red-100 dark:bg-red-500/10 p-2">
                <XCircle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Reject Booking
              </h2>
            </div>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Please provide a reason for rejecting this booking. The user will be notified.
            </p>

            <textarea
              className="w-full rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={4}
              placeholder="Enter rejection reason…"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              maxLength={500}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            <p className="text-xs text-zinc-400 text-right mt-1">{reason.length}/500</p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold py-2 transition-colors"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Reject Booking
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
