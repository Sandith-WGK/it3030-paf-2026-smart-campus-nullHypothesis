import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BookingForm from '../../components/booking/BookingForm';
import Toast from '../../components/common/Toast';
import bookingService from '../../services/api/bookingService';
import { useAuth } from '../../context/AuthContext';

function toHHmm(value) {
  if (!value) return '';
  const str = String(value);
  return str.length >= 5 ? str.substring(0, 5) : str;
}

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // JWT may encode the user id as userId, sub, or id
  const currentUserId = user?.userId ?? user?.sub ?? user?.id ?? null;
  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    bookingService
      .getBookingById(id)
      .then((res) => {
        const b = res.data?.data ?? res.data;
        if (b.status !== 'PENDING') {
          navigate(`/bookings/${id}`);
          return;
        }
        setBooking(b);
      })
      .catch(() => navigate('/bookings'))
      .finally(() => setLoadingBooking(false));
  }, [id, navigate]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      await bookingService.updateBooking(id, payload);
      setToast({ type: 'success', message: 'Booking updated successfully!' });
      setTimeout(() => navigate(`/bookings/${id}`), 800);
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        (err.response?.data?.data
          ? Object.values(err.response.data.data).join(', ')
          : 'Failed to update booking');
      setToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBooking) {
    return (
      <Layout title="Edit Booking">
        <div className="flex justify-center items-center py-32">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      </Layout>
    );
  }

  if (!booking) return null;

  // Pre-populate the form
  const initial = {
    resourceId: booking.resourceId,
    date: booking.date,
    startTime: toHHmm(booking.startTime),
    endTime: toHHmm(booking.endTime),
    purpose: booking.purpose,
    expectedAttendees: booking.expectedAttendees ?? '',
  };

  return (
    <Layout title="Edit Booking">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(`/bookings/${id}`)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Booking
        </button>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Edit Booking
          </h2>

          {/* Fixed resource banner */}
          <div className="mb-5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-sm">
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-0.5">Resource (cannot be changed)</p>
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">{booking.resourceName}</p>
            {booking.resourceLocation && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{booking.resourceLocation}</p>
            )}
          </div>

          <BookingForm
            initial={initial}
            fixedResourceId={booking.resourceId}
            onSubmit={handleSubmit}
            loading={submitting}
            submitLabel="Save Changes"
            currentUserId={currentUserId}
          />
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
