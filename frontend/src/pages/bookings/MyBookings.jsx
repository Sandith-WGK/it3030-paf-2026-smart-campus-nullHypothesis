import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CalendarDays } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BookingCard from '../../components/booking/BookingCard';
import ConfirmModal from '../../components/booking/ConfirmModal';
import Toast from '../../components/common/Toast';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonGrid } from '../../components/common/Skeleton';
import bookingService from '../../services/api/bookingService';

const TABS = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(undefined);
  const [toast, setToast] = useState(null);

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    bookingService
      .getMyBookings(activeTab)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setBookings(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setToast({ type: 'error', message: 'Failed to load bookings' }))
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      await bookingService.cancelBooking(cancelTarget.id);
      setToast({ type: 'success', message: 'Booking cancelled successfully' });
      setCancelTarget(null);
      load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message ?? 'Failed to cancel booking',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await bookingService.deleteBooking(deleteTarget.id);
      setToast({ type: 'success', message: 'Booking deleted' });
      setDeleteTarget(null);
      load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message ?? 'Failed to delete booking',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Layout title="My Bookings">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Bookings</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage your resource reservations
          </p>
        </div>
        <button
          onClick={() => navigate('/bookings/new')}
          className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          <Plus size={16} />
          New Booking
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.value)}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab.value
                ? 'bg-violet-600 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings found"
          message={
            activeTab
              ? `You have no ${activeTab.toLowerCase()} bookings.`
              : 'You have not made any bookings yet.'
          }
          action={
            <button
              onClick={() => navigate('/bookings/new')}
              className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              Book a Resource
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map((b, i) => (
            <BookingCard
              key={b.id}
              booking={b}
              index={i}
              onCancel={setCancelTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Cancel modal */}
      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Booking"
        message={`Are you sure you want to cancel your booking for "${cancelTarget?.resourceName}"? This action cannot be undone.`}
        confirmLabel="Yes, Cancel"
        confirmVariant="warning"
        loading={cancelLoading}
      />

      {/* Delete modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Booking"
        message="Are you sure you want to permanently delete this booking?"
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteLoading}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
