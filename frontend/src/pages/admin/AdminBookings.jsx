import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  ChevronRight,
  BarChart3,
  Download,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BookingFilters from '../../components/booking/BookingFilters';
import BookingStatusBadge from '../../components/booking/BookingStatusBadge';
import RejectModal from '../../components/booking/RejectModal';
import ConfirmModal from '../../components/booking/ConfirmModal';
import Toast from '../../components/common/Toast';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonGrid } from '../../components/common/Skeleton';
import bookingService from '../../services/api/bookingService';
import BookingAnalyticsPanel from '../../components/booking/BookingAnalyticsPanel';
import { generateBookingsListPDF } from '../../utils/pdfExport';

const PAGE_SIZE = 20;
const BUSINESS_TIMEZONE = 'Asia/Colombo';

function parseFiltersFromSearch(search) {
  const params = new URLSearchParams(search);
  const status = params.get('status') || undefined;
  const resourceId = params.get('resourceId') || undefined;
  const userId = params.get('userId') || undefined;
  const date = params.get('date') || undefined;
  return { status, resourceId, userId, date };
}

function todayInTimezone(timeZone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

// Pending bookings always surface first, then sort by date descending
function sortBookings(list) {
  return [...list].sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    return (b.date ?? '').localeCompare(a.date ?? '');
  });
}

export default function AdminBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => parseFiltersFromSearch(location.search));
  const [toast, setToast] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [exportScope, setExportScope] = useState('filtered');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Single reject/approve
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Bulk approve
  const [selected, setSelected] = useState(new Set());
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const headerCheckboxRef = useRef(null);

  // IDs being animated out after an action
  const [removingIds, setRemovingIds] = useState(new Set());

  const load = useCallback(() => {
    setLoading(true);
    setSelected(new Set());
    bookingService
      .getAllBookings({ ...filters, page, size: PAGE_SIZE })
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        const list = Array.isArray(raw?.content) ? raw.content : Array.isArray(raw) ? raw : [];
        setBookings(sortBookings(list));
        setHasMore(Boolean(raw?.hasNext));
      })
      .catch(() => {
        setToast({ type: 'error', message: 'Failed to load bookings' });
        setHasMore(false);
      })
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setFilters(parseFiltersFromSearch(location.search));
    setPage(0);
  }, [location.search]);

  useEffect(() => {
    // Keep only IDs that are still visible and pending on the current page.
    const visiblePendingIds = new Set(
      bookings.filter((b) => b.status === 'PENDING').map((b) => b.id),
    );
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => visiblePendingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [bookings]);

  // ── Animate a booking row out then reload ─────────────────────────────────────
  const animateAndReload = (ids) => {
    setRemovingIds(new Set(ids));
    setTimeout(() => {
      setRemovingIds(new Set());
      load();
    }, 350);
  };

  // ── Single approve ────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (approveLoading || !approveTarget) return;
    setApproveLoading(true);
    try {
      await bookingService.approveBooking(approveTarget.id);
      setToast({ type: 'success', message: `Booking approved for ${approveTarget.userName}` });
      setApproveTarget(null);
      animateAndReload([approveTarget.id]);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Failed to approve' });
    } finally {
      setApproveLoading(false);
    }
  };

  // ── Single reject ─────────────────────────────────────────────────────────────
  const handleReject = async (reason) => {
    setRejectLoading(true);
    try {
      await bookingService.rejectBooking(rejectTarget.id, reason);
      setToast({ type: 'success', message: 'Booking rejected' });
      const id = rejectTarget.id;
      setRejectTarget(null);
      animateAndReload([id]);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Failed to reject' });
    } finally {
      setRejectLoading(false);
    }
  };

  // ── Bulk approve ──────────────────────────────────────────────────────────────
  const handleBulkApprove = async () => {
    if (bulkLoading) return;
    setBulkLoading(true);
    const ids = selectedPendingIds;
    if (ids.length === 0) {
      setBulkLoading(false);
      setBulkApproveOpen(false);
      return;
    }
    try {
      const results = await Promise.allSettled(ids.map((id) => bookingService.approveBooking(id)));
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed    = results.filter((r) => r.status === 'rejected');

      if (failed.length === 0) {
        setToast({ type: 'success', message: `${succeeded} booking${succeeded > 1 ? 's' : ''} approved` });
      } else if (succeeded > 0) {
        const reasons = failed.map((r) => r.reason?.response?.data?.message).filter(Boolean).join('; ');
        setToast({
          type: 'error',
          message: `${succeeded} approved, ${failed.length} failed${reasons ? ': ' + reasons : ' (conflicts or errors)'}`,
        });
      } else {
        const reasons = failed.map((r) => r.reason?.response?.data?.message).filter(Boolean).join('; ');
        setToast({ type: 'error', message: `All ${failed.length} approvals failed${reasons ? ': ' + reasons : ''}` });
      }

      setBulkApproveOpen(false);
      animateAndReload(ids);
    } catch {
      setToast({ type: 'error', message: 'Bulk approval failed. Please try again.' });
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Selection helpers ─────────────────────────────────────────────────────────
  const actionableBookings = bookings.filter((b) => b.status === 'PENDING');
  const selectedPendingIds = actionableBookings.filter((b) => selected.has(b.id)).map((b) => b.id);
  const selectedPendingCount = selectedPendingIds.length;
  const selectedTotalCount = selected.size;
  const allPendingSelected =
    actionableBookings.length > 0 && selectedPendingCount === actionableBookings.length;
  const hasIndeterminateSelection = selectedPendingCount > 0 && !allPendingSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = hasIndeterminateSelection;
    }
  }, [hasIndeterminateSelection]);

  const tableScopeLabel = useMemo(
    () => `Current page scope: ${bookings.length} booking(s), max ${PAGE_SIZE} per page.`,
    [bookings.length],
  );

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(actionableBookings.map((b) => b.id)));
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const approvedCount = bookings.filter((b) => b.status === 'APPROVED').length;
  const today = todayInTimezone(BUSINESS_TIMEZONE);
  const todayCount = bookings.filter((b) => b.date === today).length;

  const getRowsForAllFilteredBookings = useCallback(async () => {
    const size = 100;
    let currentPage = 0;
    let hasNextPage = true;
    const rows = [];

    while (hasNextPage) {
      const res = await bookingService.getAllBookings({ ...filters, page: currentPage, size });
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw?.content) ? raw.content : Array.isArray(raw) ? raw : [];
      rows.push(...list);
      hasNextPage = Boolean(raw?.hasNext);
      currentPage += 1;
      if (!raw?.content) {
        hasNextPage = false;
      }
    }

    return sortBookings(rows);
  }, [filters]);

  const getRowsForExport = useCallback(async () => (
    exportScope === 'page' ? bookings : getRowsForAllFilteredBookings()
  ), [bookings, exportScope, getRowsForAllFilteredBookings]);

  const escapeCsvCell = (value) => {
    if (value == null) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCsv = (rows) => {
    const headers = [
      'Booking ID',
      'Resource ID',
      'Resource',
      'Requested By',
      'Email',
      'Date',
      'Time',
      'Attendees',
      'Status',
    ];
    const csvRows = rows.map((b) => ([
      b.id ?? '',
      b.resourceId ?? 'N/A',
      b.resourceName ?? '',
      b.userName ?? '',
      b.userEmail ?? '',
      b.date ?? '',
      `${b.startTime ?? '-'} - ${b.endTime ?? '-'}`,
      b.expectedAttendees ?? '',
      b.status ?? '',
    ]));
    const content = [headers, ...csvRows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (exportingPdf || exportingCsv) return;
    setExportingPdf(true);
    try {
      const targetRows = await getRowsForExport();

      if (!targetRows.length) {
        setToast({ type: 'error', message: 'No bookings available for export' });
        return;
      }

      generateBookingsListPDF(targetRows, filters, {
        scope: exportScope === 'page' ? 'Current page only' : 'Current filtered results',
        generatedBy: 'Admin',
      });
      setToast({ type: 'success', message: `Exported ${targetRows.length} booking(s) to PDF` });
    } catch {
      setToast({ type: 'error', message: 'Failed to export bookings PDF' });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCSV = async () => {
    if (exportingPdf || exportingCsv) return;
    setExportingCsv(true);
    try {
      const targetRows = await getRowsForExport();

      if (!targetRows.length) {
        setToast({ type: 'error', message: 'No bookings available for export' });
        return;
      }

      downloadCsv(targetRows);
      setToast({ type: 'success', message: `Exported ${targetRows.length} booking(s) to CSV` });
    } catch {
      setToast({ type: 'error', message: 'Failed to export bookings CSV' });
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <Layout title="Manage Bookings">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Manage Bookings</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Review, approve or reject booking requests
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Showing page {page + 1} (up to {PAGE_SIZE} bookings per page)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="toggle-booking-analytics"
            onClick={() => setShowAnalytics((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
              showAnalytics
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-400/20'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-violet-400 hover:text-violet-600'
            }`}
          >
            <BarChart3 size={14} />
            Analytics
          </button>
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Scope</label>
          <select
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200"
            disabled={loading || exportingPdf || exportingCsv}
            aria-label="Export scope"
          >
            <option value="filtered">Current filtered results</option>
            <option value="page">Current page only</option>
          </select>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={loading || exportingPdf || exportingCsv || bookings.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={bookings.length === 0 ? 'No bookings to export' : 'Export bookings as PDF'}
          >
            <Download size={14} />
            {exportingPdf ? 'Exporting…' : 'Export PDF'}
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || exportingPdf || exportingCsv || bookings.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={bookings.length === 0 ? 'No bookings to export' : 'Export bookings as CSV'}
          >
            <Download size={14} />
            {exportingCsv ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Analytics panel */}
      <AnimatePresence>
        {showAnalytics && (
          <Motion.div
            key="analytics-panel"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-5"
          >
            <BookingAnalyticsPanel />
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Pending',
            value: pendingCount,
            color: 'text-yellow-600 dark:text-yellow-400',
            bg: 'bg-yellow-50 dark:bg-yellow-500/10',
          },
          {
            label: 'Approved',
            value: approvedCount,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-500/10',
          },
          {
            label: "Today's Bookings",
            value: todayCount,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-500/10',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border border-zinc-200 dark:border-zinc-800 ${s.bg} px-4 py-3`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5">
        <BookingFilters
          filters={filters}
          onChange={(nextFilters) => {
            setFilters(nextFilters);
            setPage(0);
          }}
        />
      </div>

      {/* Bulk approve toolbar */}
      <AnimatePresence>
        {selectedPendingCount > 0 && (
          <Motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-4 py-3 mb-4"
          >
            <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
              Selected on current page: {selectedTotalCount} total, {selectedPendingCount}{' '}
              actionable pending
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300"
              >
                Clear
              </button>
              <button
                onClick={() => setBulkApproveOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 size={13} /> Approve All Selected
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Booking list */}
      {loading ? (
        <SkeletonGrid />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings found"
          message="Try changing the filters or check back later."
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tableScopeLabel}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Bulk approve eligibility: pending bookings only.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="px-4 py-3 w-12">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={toggleSelectAll}
                      disabled={actionableBookings.length === 0}
                      aria-label="Select all pending bookings on current page"
                      className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
                    />
                  </th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Requested By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Attendees</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {bookings.map((b) => {
                    const isRemoving = removingIds.has(b.id);
                    const isPending = b.status === 'PENDING';
                    const isSelected = selected.has(b.id);
                    const rowClasses = isSelected
                      ? 'bg-violet-50/70 dark:bg-violet-500/10'
                      : 'bg-white dark:bg-zinc-900';

                    return (
                      <Motion.tr
                        key={b.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={isRemoving ? { opacity: 0, x: 24 } : { opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ duration: 0.2 }}
                        className={`${rowClasses} border-t border-zinc-100 dark:border-zinc-800`}
                      >
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(b.id)}
                            disabled={!isPending}
                            aria-label={`Select booking ${b.id}`}
                            title={!isPending ? 'Only pending bookings are actionable for bulk approve' : 'Select booking'}
                            className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{b.resourceName}</p>
                            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              ID: {b.resourceId ?? 'N/A'}
                            </p>
                            {b.resourceRecordDeleted && (
                              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                record deleted
                              </p>
                            )}
                            {b.rejectionReason && b.status === 'REJECTED' && (
                              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{b.rejectionReason}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          <div className="min-w-0">
                            <p className="truncate">{b.userName ?? 'N/A'}</p>
                            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {b.userEmail ?? 'N/A'}
                            </p>
                            {b.userRecordDeleted && (
                              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                record deleted
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                            <CalendarDays size={12} /> {b.date}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                            <Clock size={12} /> {b.startTime} – {b.endTime}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {b.expectedAttendees ? (
                            <span className="flex items-center gap-1">
                              <Users size={12} /> {b.expectedAttendees}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <BookingStatusBadge status={b.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => setApproveTarget(b)}
                                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-300 dark:bg-green-500/10 dark:hover:bg-green-500/20 transition-colors"
                                >
                                  <CheckCircle2 size={13} /> Approve
                                </button>
                                <button
                                  onClick={() => setRejectTarget(b)}
                                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                >
                                  <XCircle size={13} /> Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => navigate(`/bookings/${b.id}`, { state: { from: location.pathname + location.search } })}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="View details"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </td>
                      </Motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination controls */}
      {!loading && bookings.length > 0 && (
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

      {/* Single approve confirmation */}
      <ConfirmModal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title="Approve Booking"
        message={`Approve ${approveTarget?.userName}'s booking for "${approveTarget?.resourceName}" on ${approveTarget?.date}?`}
        confirmLabel="Approve"
        confirmVariant="primary"
        loading={approveLoading}
      />

      {/* Bulk approve confirmation */}
      <ConfirmModal
        open={bulkApproveOpen}
        onClose={() => setBulkApproveOpen(false)}
        onConfirm={handleBulkApprove}
        title="Bulk Approve"
        message={`Approve ${selectedPendingCount} actionable pending booking(s) selected on this page?`}
        confirmLabel={bulkLoading ? 'Approving…' : `Approve ${selectedPendingCount}`}
        confirmVariant="primary"
        loading={bulkLoading}
      />

      {/* Reject modal */}
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={rejectLoading}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
