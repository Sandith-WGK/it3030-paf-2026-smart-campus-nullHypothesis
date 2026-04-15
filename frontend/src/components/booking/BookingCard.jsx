import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { CalendarDays, Clock, MapPin, Users, Pencil, Trash2, XCircle, RefreshCw } from 'lucide-react';
import BookingStatusBadge from './BookingStatusBadge';

const resourceTypeIcon = {
  HALL: '🏛️',
  LAB: '🔬',
  ROOM: '🚪',
  EQUIPMENT: '🖥️',
};

export default function BookingCard({ booking, onCancel, onDelete, index = 0 }) {
  const navigate = useNavigate();

  const handleClick = () => navigate(`/bookings/${booking.id}`);

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:border-zinc-800 dark:bg-zinc-900"
      onClick={handleClick}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none shrink-0">
            {resourceTypeIcon[booking.resourceType] ?? '📦'}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-sm">
              {booking.resourceName}
            </p>
            {booking.resourceLocation && (
              <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                <MapPin size={11} />
                {booking.resourceLocation}
              </p>
            )}
          </div>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <CalendarDays size={13} />
          <span>{booking.date}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <Clock size={13} />
          <span>
            {booking.startTime} – {booking.endTime}
          </span>
        </div>
        {booking.expectedAttendees && (
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <Users size={13} />
            <span>{booking.expectedAttendees} attendees</span>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
        {booking.purpose}
      </p>

      {/* Actions */}
      <div
        className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {booking.status === 'PENDING' && (
          <button
            onClick={() => navigate(`/bookings/${booking.id}/edit`)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-violet-600 bg-violet-50 hover:bg-violet-100 dark:text-violet-300 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-colors"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
        {booking.status === 'APPROVED' && onCancel && (
          <button
            onClick={() => onCancel(booking)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 transition-colors"
          >
            <XCircle size={12} />
            Cancel
          </button>
        )}
        {(booking.status === 'REJECTED' || booking.status === 'CANCELLED') && (
          <button
            onClick={() => navigate(`/bookings/new?rebook=${booking.id}`)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-violet-600 bg-violet-50 hover:bg-violet-100 dark:text-violet-300 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-colors"
          >
            <RefreshCw size={12} />
            Rebook
          </button>
        )}
        {(booking.status === 'PENDING' || booking.status === 'CANCELLED') && onDelete && (
          <button
            onClick={() => onDelete(booking)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>

      {booking.status === 'REJECTED' && booking.rejectionReason && (
        <p className="mt-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg p-2">
          <span className="font-semibold">Reason: </span>
          {booking.rejectionReason}
        </p>
      )}
    </Motion.div>
  );
}
