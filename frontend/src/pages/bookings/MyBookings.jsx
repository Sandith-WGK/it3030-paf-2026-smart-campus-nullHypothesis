import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Plus, CalendarDays, List, ChevronLeft, ChevronRight } from 'lucide-react';
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

const STATUS_DOT = {
  PENDING: 'bg-yellow-400',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-400',
  CANCELLED: 'bg-zinc-400',
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function getCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Mini calendar view ───────────────────────────────────────────────────────

function CalendarView({ bookings, onDayClick }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Group bookings by date string
  const byDate = bookings.reduce((acc, b) => {
    if (!b.date) return acc;
    (acc[b.date] = acc[b.date] ?? []).push(b);
    return acc;
  }, {});

  const cells = getCalendarGrid(viewYear, viewMonth);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{monthName}</h3>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-16 border-b border-r border-zinc-100 dark:border-zinc-800 last:border-r-0" />;
          }
          const dateStr = isoDate(viewYear, viewMonth, day);
          const dayBookings = byDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const hasBookings = dayBookings.length > 0;

          return (
            <button
              key={dateStr}
              onClick={() => hasBookings && onDayClick(dateStr)}
              className={[
                'h-16 p-1.5 flex flex-col items-start border-b border-r border-zinc-100 dark:border-zinc-800 last:border-r-0 transition-colors text-left',
                hasBookings
                  ? 'hover:bg-violet-50 dark:hover:bg-violet-500/10 cursor-pointer'
                  : 'cursor-default',
              ].join(' ')}
            >
              <span
                className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {day}
              </span>
              {/* Status dots (max 3) */}
              <div className="flex flex-wrap gap-0.5 mt-1">
                {dayBookings.slice(0, 3).map((b, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${STATUS_DOT[b.status] ?? 'bg-zinc-400'}`}
                    title={`${b.resourceName} – ${b.status}`}
                  />
                ))}
                {dayBookings.length > 3 && (
                  <span className="text-[9px] font-semibold text-zinc-400 leading-none mt-0.5">
                    +{dayBookings.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
        {Object.entries(STATUS_DOT).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(undefined);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarFilter, setCalendarFilter] = useState(null); // date string from calendar click
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    bookingService
      .getMyBookings(activeTab, page, 20)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        const rows = Array.isArray(raw?.content) ? raw.content : Array.isArray(raw) ? raw : [];
        setBookings(rows);
        setHasMore(Boolean(raw?.hasNext));
      })
      .catch(() => setToast({ type: 'error', message: 'Failed to load bookings' }))
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Clear calendar filter when switching tabs or view modes
  useEffect(() => {
    setCalendarFilter(null);
    setPage(0);
  }, [activeTab, viewMode]);

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

  // Bookings displayed in list (apply optional calendar date filter)
  const displayedBookings = calendarFilter
    ? bookings.filter((b) => b.date === calendarFilter)
    : bookings;

  return (
    <Layout title="My Bookings">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Bookings</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage your resource reservations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Calendar view"
            >
              <CalendarDays size={16} />
            </button>
          </div>

          <button
            onClick={() => navigate('/bookings/new')}
            className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            <Plus size={16} />
            New Booking
          </button>
        </div>
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
      ) : viewMode === 'calendar' ? (
        <>
          <CalendarView
            bookings={bookings}
            onDayClick={(date) =>
              setCalendarFilter((prev) => (prev === date ? null : date))
            }
          />
          {/* When a day is selected, show that day's bookings below */}
          {calendarFilter && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Bookings on {calendarFilter}
                </h3>
                <button
                  onClick={() => setCalendarFilter(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  Clear
                </button>
              </div>
              {displayedBookings.length === 0 ? (
                <p className="text-sm text-zinc-400 italic">No bookings on this day.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {displayedBookings.map((b, i) => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        index={i}
                        onCancel={setCancelTarget}
                        onDelete={setDeleteTarget}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </>
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
          <AnimatePresence>
            {bookings.map((b, i) => (
              <BookingCard
                key={b.id}
                booking={b}
                index={i}
                onCancel={setCancelTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </AnimatePresence>
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

      {!loading && viewMode === 'list' && bookings.length > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Page {page + 1}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
