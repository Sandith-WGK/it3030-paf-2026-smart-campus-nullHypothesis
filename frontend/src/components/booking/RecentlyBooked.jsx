import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Loader2 } from 'lucide-react';
import bookingService from '../../services/api/bookingService';

const STATUS_STYLES = {
  PENDING: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  APPROVED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  REJECTED: 'bg-red-500/15 text-red-700 dark:text-red-300',
  CANCELLED: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
};
const EXCLUDED_STATUSES = new Set(['PENDING']);

const formatDateTime = (date, startTime, endTime) => {
  if (!date) return 'Date unavailable';
  const parsedDate = new Date(date);
  const dateLabel = Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeLabel = startTime && endTime ? `${startTime} - ${endTime}` : null;
  return timeLabel ? `${dateLabel} - ${timeLabel}` : dateLabel;
};

export default function RecentlyBooked({ refreshKey = 0, limit = 5 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingService.getRecentBookings(limit);
      const payload = res.data?.data ?? res.data;
      const rows = Array.isArray(payload) ? payload : [];
      setItems(rows.filter((item) => !EXCLUDED_STATUSES.has(item.status)));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent, refreshKey]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 text-center">
        <Loader2 size={20} className="animate-spin mx-auto text-zinc-400" />
        <p className="text-xs text-zinc-400 mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-violet-500" />
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Recently Booked</h3>
          <span className="text-xs text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-7 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No recent bookings yet</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Your latest bookings appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/bookings/${item.id}`}
              className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.resourceName}</p>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[item.status] ?? STATUS_STYLES.CANCELLED}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {formatDateTime(item.date, item.startTime, item.endTime)}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">Personal - only visible to your account</p>
      </div>
    </div>
  );
}
