import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  ChevronRight,
  CheckSquare,
  Square,
  Loader2,
  BarChart3,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BookingFilters from '../../components/booking/BookingFilters';
import BookingStatusBadge from '../../components/booking/BookingStatusBadge';
import RejectModal from '../../components/booking/RejectModal';
import ConfirmModal from '../../components/booking/ConfirmModal';
import Toast from '../../components/common/Toast';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonGrid } from '../../components/common/Skeleton';
import bookingService from '../../services/api/bookingService';
import BookingAnalyticsPanel from '../../components/booking/BookingAnalyticsPanel';

// Pending bookings always surface first, then sort by date descending
function sortBookings(list) {
  return [...list].sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    return (b.date ?? '').localeCompare(a.date ?? '');
  });
}

export default function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [toast, setToast] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Single reject/approve
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Bulk approve
  const [selected, setSelected] = useState(new Set());
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // IDs being animated out after an action
  const [removingIds, setRemovingIds] = useState(new Set());

  const load = useCallback(() => {
    setLoading(true);
    setSelected(new Set());
    bookingService
      .getAllBookings(filters)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setBookings(Array.isArray(raw) ? sortBookings(raw) : []);
      })
      .catch(() => setToast({ type: 'error', message: 'Failed to load bookings' }))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Animate a booking row out then reload ─────────────────────────────────────
  const animateAndReload = (ids) => {
    setRemovingIds(new Set(ids));
    setTimeout(() => {
      setRemovingIds(new Set());
      load();
    }, 350);
  };

  // ── Single approve ────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      await bookingService.approveBooking(approveTarget.id);
      setToast({ type: 'success', message: `Booking approved for ${approveTarget.userName}` });
      setApproveTarget(null);
      animateAndReload([approveTarget.id]);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Failed to approve' });
    } finally {
      setApproveLoading(false);
    }
  };

  // ── Single reject ─────────────────────────────────────────────────────────────
  const handleReject = async (reason) => {
    setRejectLoading(true);
    try {
      await bookingService.rejectBooking(rejectTarget.id, reason);
      setToast({ type: 'success', message: 'Booking rejected' });
      const id = rejectTarget.id;
      setRejectTarget(null);
      animateAndReload([id]);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Failed to reject' });
    } finally {
      setRejectLoading(false);
    }
  };

  // ── Bulk approve ──────────────────────────────────────────────────────────────
  const handleBulkApprove = async () => {
    setBulkLoading(true);
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => bookingService.approveBooking(id)));
      setToast({ type: 'success', message: `${ids.length} booking${ids.length > 1 ? 's' : ''} approved` });
      setBulkApproveOpen(false);
      animateAndReload(ids);
    } catch {
      setToast({ type: 'error', message: 'Some bookings could not be approved' });
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Selection helpers ─────────────────────────────────────────────────────────
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
  const allPendingSelected =
    pendingBookings.length > 0 && pendingBookings.every((b) => selected.has(b.id));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingBookings.map((b) => b.id)));
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const approvedCount = bookings.filter((b) => b.status === 'APPROVED').length;
  const today = new Date().toISOString().split('T')[0];
  const todayCount = bookings.filter((b) => b.date === today).length;

  return (
    <Layout title="Manage Bookings">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Manage Bookings</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Review, approve or reject booking requests
          </p>
        </div>
        <button
          id="toggle-booking-analytics"
          onClick={() => setShowAnalytics((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
            showAnalytics
              ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-400/20'
              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-violet-400 hover:text-violet-600'
          }`}
        >
          <BarChart3 size={14} />
          Analytics
        </button>
      </div>

      {/* Analytics panel */}
      <AnimatePresence>
        {showAnalytics && (
          <Motion.div
            key="analytics-panel"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-5"
          >
            <BookingAnalyticsPanel />
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Pending',
            value: pendingCount,
            color: 'text-yellow-600 dark:text-yellow-400',
            bg: 'bg-yellow-50 dark:bg-yellow-500/10',
          },
          {
            label: 'Approved',
            value: approvedCount,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
          {
            label: "Today's Bookings",
            value: todayCount,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-500/10',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border border-zinc-200 dark:border-zinc-800 ${s.bg} px-4 py-3`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5">
        <BookingFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Bulk approve toolbar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <Motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-4 py-3 mb-4"
          >
            <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
              {selected.size} booking{selected.size > 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300"
              >
                Clear
              </button>
              <button
                onClick={() => setBulkApproveOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 size={13} /> Approve All Selected
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Select-all pending row */}
      {!loading && pendingBookings.length > 1 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            {allPendingSelected ? (
              <CheckSquare size={15} className="text-violet-600" />
            ) : (
              <Square size={15} />
            )}
            {allPendingSelected ? 'Deselect all pending' : `Select all ${pendingBookings.length} pending`}
          </button>
        </div>
      )}

      {/* Booking list */}
      {loading ? (
        <SkeletonGrid />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings found"
          message="Try changing the filters or check back later."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {bookings.map((b) => {
              const isRemoving = removingIds.has(b.id);
              const isPending = b.status === 'PENDING';
              const isSelected = selected.has(b.id);

              return (
                <Motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={isRemoving ? { opacity: 0, x: 40, height: 0 } : { opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  transition={{ duration: 0.28 }}
                  className={`rounded-xl border bg-white dark:bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
                    isSelected
                      ? 'border-violet-300 dark:border-violet-500/50'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {/* Checkbox (pending only) */}
                  {isPending && (
                    <button
                      onClick={() => toggleSelect(b.id)}
                      className="shrink-0 text-zinc-400 hover:text-violet-600 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-violet-600" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {b.resourceName}
                      </p>
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                      Requested by{' '}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {b.userName}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={11} /> {b.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {b.startTime} – {b.endTime}
                      </span>
                      {b.expectedAttendees && (
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {b.expectedAttendees}
                        </span>
                      )}
                    </div>
                    {b.status === 'REJECTED' && b.rejectionReason && (
                      <p className="mt-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded px-2 py-1 inline-block">
                        {b.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                      <>
                        <button
                          onClick={() => setApproveTarget(b)}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-300 dark:bg-green-500/10 dark:hover:bg-green-500/20 transition-colors"
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          onClick={() => setRejectTarget(b)}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(`/bookings/${b.id}`)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="View details"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </Motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Single approve confirmation */}
      <ConfirmModal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title="Approve Booking"
        message={`Approve ${approveTarget?.userName}'s booking for "${approveTarget?.resourceName}" on ${approveTarget?.date}?`}
        confirmLabel="Approve"
        confirmVariant="primary"
        loading={approveLoading}
      />

      {/* Bulk approve confirmation */}
      <ConfirmModal
        open={bulkApproveOpen}
        onClose={() => setBulkApproveOpen(false)}
        onConfirm={handleBulkApprove}
        title="Bulk Approve"
        message={`Approve all ${selected.size} selected pending bookings?`}
        confirmLabel={bulkLoading ? 'Approving…' : `Approve ${selected.size}`}
        confirmVariant="primary"
        loading={bulkLoading}
      />

      {/* Reject modal */}
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={rejectLoading}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
