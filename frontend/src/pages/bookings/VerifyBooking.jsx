import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, CalendarDays, Clock, MapPin, User } from 'lucide-react';
import bookingService from '../../services/api/bookingService';

export default function VerifyBooking() {
  const { id } = useParams();
  const [state, setState] = useState('loading'); // 'loading' | 'success' | 'error'
  const [booking, setBooking] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    bookingService
      .verifyBooking(id)
      .then((res) => {
        const b = res.data?.data ?? res.data;
        setBooking(b);
        setState('success');
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message ??
          'Unable to verify this booking. It may be invalid or expired.';
        setErrorMessage(msg);
        setState('error');
      });
  }, [id]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        {/* ── Loading ── */}
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-20 animate-pulse">
            <Loader2 size={48} className="animate-spin text-violet-500" />
            <p className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
              Verifying booking…
            </p>
          </div>
        )}

        {/* ── Success ── */}
        {state === 'success' && booking && (
          <div className="rounded-2xl border border-green-200 dark:border-green-500/30 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden animate-in fade-in">
            {/* Green header */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-8 flex flex-col items-center gap-3">
              <CheckCircle2 size={72} className="text-white drop-shadow-lg" />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                VALID BOOKING
              </h1>
              <p className="text-green-100 text-sm">Check-in verified successfully</p>
            </div>

            {/* Booking details */}
            <div className="px-6 py-6 space-y-4">
              <DetailRow
                icon={MapPin}
                label="Resource"
                value={booking.resourceName}
                sub={booking.resourceLocation}
              />
              <DetailRow
                icon={User}
                label="Booked By"
                value={booking.userName}
                sub={booking.userEmail}
              />
              <DetailRow
                icon={CalendarDays}
                label="Date"
                value={booking.date}
              />
              <DetailRow
                icon={Clock}
                label="Time Slot"
                value={`${booking.startTime} – ${booking.endTime}`}
              />
              {booking.expectedAttendees && (
                <DetailRow
                  icon={User}
                  label="Expected Attendees"
                  value={booking.expectedAttendees}
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-green-50 dark:bg-green-500/5 border-t border-green-100 dark:border-green-500/20 text-center">
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                ✓ Please allow entry for the person named above
              </p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {state === 'error' && (
          <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden animate-in fade-in">
            {/* Red header */}
            <div className="bg-gradient-to-br from-red-500 to-rose-600 px-6 py-8 flex flex-col items-center gap-3">
              <XCircle size={72} className="text-white drop-shadow-lg" />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                INVALID OR EXPIRED
              </h1>
            </div>

            {/* Error message */}
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-red-50 dark:bg-red-500/5 border-t border-red-100 dark:border-red-500/20 text-center">
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                ✗ Do NOT allow entry — this booking cannot be verified
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Small detail row used in the success card */
function DetailRow({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-green-50 dark:bg-green-500/10 p-2">
        <Icon size={16} className="text-green-600 dark:text-green-400" />
      </div>
      <div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{value}</p>
        {sub && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
        )}
      </div>
    </div>
  );
}
