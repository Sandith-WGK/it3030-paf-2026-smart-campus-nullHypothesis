import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
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

export default function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [toast, setToast] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    bookingService
      .getAllBookings(filters)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setBookings(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setToast({ type: 'error', message: 'Failed to load bookings' }))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      await bookingService.approveBooking(approveTarget.id);
      setToast({ type: 'success', message: `Booking approved for ${approveTarget.userName}` });
      setApproveTarget(null);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Failed to approve' });
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async (reason) => {
    setRejectLoading(true);
    try {
      await bookingService.rejectBooking(rejectTarget.id, reason);
      setToast({ type: 'success', message: 'Booking rejected' });
      setRejectTarget(null);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Failed to reject' });
    } finally {
      setRejectLoading(false);
    }
  };

  // Summary stats
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const approvedCount = bookings.filter((b) => b.status === 'APPROVED').length;
  const today = new Date().toISOString().split('T')[0];
  const todayCount = bookings.filter((b) => b.date === today).length;

  return (
    <Layout title="Manage Bookings">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Manage Bookings</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Review, approve or reject booking requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: pendingCount, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
          { label: 'Approved', value: approvedCount, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
          { label: "Today's Bookings", value: todayCount, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
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
          {bookings.map((b, i) => (
            <Motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {b.resourceName}
                  </p>
                  <BookingStatusBadge status={b.status} />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  Requested by <span className="font-medium text-zinc-700 dark:text-zinc-300">{b.userName}</span>
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
                {b.status === 'PENDING' && (
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
          ))}
        </div>
      )}

      {/* Approve confirmation */}
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
