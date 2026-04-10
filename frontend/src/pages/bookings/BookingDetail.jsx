import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Loader2,
  Pencil,
  XCircle,
  Trash2,
  FileDown,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BookingStatusBadge from '../../components/booking/BookingStatusBadge';
import BookingTimeline from '../../components/booking/BookingTimeline';
import ConfirmModal from '../../components/booking/ConfirmModal';
import Toast from '../../components/common/Toast';
import bookingService from '../../services/api/bookingService';
import { isAdmin } from '../../utils/auth';
import { generateBookingPDF } from '../../utils/pdfExport';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [sameResourceBookings, setSameResourceBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const admin = isAdmin();

  useEffect(() => {
    setLoading(true);
    bookingService
      .getBookingById(id)
      .then(async (res) => {
        const b = res.data?.data ?? res.data;
        setBooking(b);
        // Load sibling bookings for timeline — admin sees all, user sees own
        try {
          const sibRes = await bookingService.getAllBookings({
            resourceId: b.resourceId,
            date: b.date,
          });
          setSameResourceBookings(sibRes.data?.data ?? []);
        } catch {
          // Non-admin users will receive 403 — silently skip the timeline
        }
      })
      .catch(() => navigate('/bookings'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await bookingService.cancelBooking(id);
      setBooking(res.data?.data ?? booking);
      setToast({ type: 'success', message: 'Booking cancelled successfully' });
      setCancelOpen(false);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Failed to cancel' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await bookingService.deleteBooking(id);
      setToast({ type: 'success', message: 'Booking deleted' });
      setTimeout(() => navigate('/bookings'), 800);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Failed to delete' });
    } finally {
      setActionLoading(false);
      setDeleteOpen(false);
    }
  };

  const handleExportPDF = () => {
    if (!booking) return;
    generateBookingPDF(booking);
  };

  if (loading) {
    return (
      <Layout title="Booking Details">
        <div className="flex justify-center items-center py-32">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      </Layout>
    );
  }

  if (!booking) return null;

  const canEdit = booking.status === 'PENDING';
  const canCancel = booking.status === 'APPROVED';
  const canDelete =
    admin || booking.status === 'PENDING' || booking.status === 'CANCELLED';

  const detail = (Icon, label, value) =>
    value ? (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1.5">
          <Icon size={14} className="text-zinc-500 dark:text-zinc-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <Layout title="Booking Details">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to My Bookings
        </button>

        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {booking.resourceName}
              </h2>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">
                {booking.resourceType} · {booking.resourceLocation}
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          {/* Details grid */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {detail(CalendarDays, 'Date', booking.date)}
            {detail(Clock, 'Time', `${booking.startTime} – ${booking.endTime}`)}
            {detail(MapPin, 'Location', booking.resourceLocation)}
            {detail(Users, 'Expected Attendees', booking.expectedAttendees)}
          </div>

          {/* Purpose */}
          <div className="px-6 pb-5">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Purpose</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {booking.purpose}
            </p>
          </div>

          {/* Rejection reason */}
          {booking.status === 'REJECTED' && booking.rejectionReason && (
            <div className="mx-6 mb-5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                Rejection Reason
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">{booking.rejectionReason}</p>
            </div>
          )}

          {/* Timeline */}
          {sameResourceBookings.length > 0 && (
            <div className="px-6 pb-5 border-t border-zinc-100 dark:border-zinc-800 pt-5">
              <BookingTimeline bookings={sameResourceBookings} highlightId={booking.id} />
            </div>
          )}

          {/* Action bar */}
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-3">
            {canEdit && (
              <button
                onClick={() => navigate(`/bookings/${id}/edit`)}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-violet-600 bg-violet-50 hover:bg-violet-100 dark:text-violet-300 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setCancelOpen(true)}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 transition-colors"
              >
                <XCircle size={14} />
                Cancel Booking
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            {booking.status === 'APPROVED' && (
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors ml-auto"
              >
                <FileDown size={14} />
                Export PDF
              </button>
            )}
          </div>
        </Motion.div>
      </div>

      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Booking"
        message={`Cancel your booking for "${booking.resourceName}" on ${booking.date}?`}
        confirmLabel="Yes, Cancel"
        confirmVariant="warning"
        loading={actionLoading}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Booking"
        message="Permanently delete this booking?"
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={actionLoading}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
