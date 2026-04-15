import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BookingForm from '../../components/booking/BookingForm';
import Toast from '../../components/common/Toast';
import bookingService from '../../services/api/bookingService';

export default function NewBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rebookId = searchParams.get('rebook');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [rebookSource, setRebookSource] = useState(null);

  useEffect(() => {
    if (!rebookId) return;
    bookingService
      .getBookingById(rebookId)
      .then((res) => {
        const b = res.data?.data ?? res.data;
        setRebookSource(b);
      })
      .catch(() => {
        setToast({ type: 'error', message: 'Could not load original booking details.' });
      });
  }, [rebookId]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      const res = await bookingService.createBooking(payload);
      const newId = res.data?.data?.id;
      setToast({ type: 'success', message: 'Booking created successfully!' });
      setTimeout(() => navigate(newId ? `/bookings/${newId}` : '/bookings'), 800);
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        (err.response?.data?.data
          ? Object.values(err.response.data.data).join(', ')
          : 'Failed to create booking');
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const formInitial = rebookSource
    ? {
        resourceId: rebookSource.resourceId,
        purpose: rebookSource.purpose,
        expectedAttendees: rebookSource.expectedAttendees ?? '',
      }
    : {};

  return (
    <Layout title="New Booking">
      <div className="max-w-xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to My Bookings
        </button>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Book a Resource
          </h2>

          {rebookSource ? (
            <div className="flex items-center gap-2 mb-5 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-4 py-3 text-xs text-violet-800 dark:text-violet-300">
              <RefreshCw size={13} className="shrink-0" />
              <span>
                Rebooking <span className="font-semibold">{rebookSource.resourceName}</span> — pick a new date and time below.
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Fill in the details below to submit a booking request.
            </p>
          )}

          {/* key forces a remount when rebook data arrives so initial values are applied */}
          <BookingForm
            key={rebookId ?? 'new'}
            initial={formInitial}
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel="Submit Booking Request"
          />
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
