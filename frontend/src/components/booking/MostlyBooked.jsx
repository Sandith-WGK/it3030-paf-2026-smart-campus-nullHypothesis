import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Loader2, Repeat2 } from 'lucide-react';
import bookingService from '../../services/api/bookingService';

const formatLastBooked = (value) => {
  if (!value) return 'Last booked: unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return `Last booked: ${value}`;
  return `Last booked: ${parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

export default function MostlyBooked({ refreshKey = 0, limit = 5 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingService.getMostBooked(limit);
      const payload = res.data?.data ?? res.data;
      const rows = Array.isArray(payload) ? payload : [];
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

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
          <BarChart3 size={16} className="text-violet-500" />
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Mostly Booked</h3>
          <span className="text-xs text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-7 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No frequent resources yet</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Your most booked resources will appear here
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((item) => {
            const hasRebookTarget = Boolean(item.latestBookingId);
            return (
              <div key={item.resourceId ?? item.resourceName} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {item.resourceName ?? item.resourceId ?? 'Unknown resource'}
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-500/15 text-violet-700 dark:text-violet-300 shrink-0">
                    {item.bookCount ?? 0} bookings
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {formatLastBooked(item.lastBookedAt)}
                </p>
                <div className="mt-2">
                  {hasRebookTarget ? (
                    <Link
                      to={`/bookings/new?rebook=${item.latestBookingId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg text-violet-600 bg-violet-50 hover:bg-violet-100 dark:text-violet-300 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-colors"
                    >
                      <Repeat2 size={12} />
                      Book Again
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg text-zinc-400 bg-zinc-100 dark:text-zinc-500 dark:bg-zinc-800">
                      <Repeat2 size={12} />
                      Book Again unavailable
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">Personal - only visible to your account</p>
      </div>
    </div>
  );
}
