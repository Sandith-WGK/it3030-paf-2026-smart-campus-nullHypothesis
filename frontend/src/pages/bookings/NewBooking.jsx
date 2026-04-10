import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BookingForm from '../../components/booking/BookingForm';
import Toast from '../../components/common/Toast';
import bookingService from '../../services/api/bookingService';

export default function NewBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

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
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Fill in the details below to submit a booking request.
          </p>

          <BookingForm onSubmit={handleSubmit} loading={loading} submitLabel="Submit Booking Request" />
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
