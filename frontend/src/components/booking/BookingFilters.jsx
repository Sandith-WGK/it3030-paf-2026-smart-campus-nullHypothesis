import React, { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import resourceService from '../../services/api/resourceService';

const selectClass =
  'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

export default function BookingFilters({ filters, onChange }) {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    resourceService
      .getResources()
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        const list = Array.isArray(raw) ? raw : [];
        setResources(list);
      })
      .catch(() => {});
  }, []);

  const set = (key) => (e) =>
    onChange({ ...filters, [key]: e.target.value || undefined });

  const clear = () => onChange({});

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        <Filter size={15} />
        Filters
      </div>

      {/* Status */}
      <select className={selectClass} value={filters.status ?? ''} onChange={set('status')}>
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      {/* Resource */}
      <select className={selectClass} value={filters.resourceId ?? ''} onChange={set('resourceId')}>
        <option value="">All Resources</option>
        {resources.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}{r.status && r.status !== 'ACTIVE' ? ` (${r.status})` : ''}
          </option>
        ))}
      </select>

      {/* Booking Date */}
      <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>Booking Date</span>
        <input
          type="date"
          className={selectClass}
          value={filters.bookingDate ?? ''}
          onChange={set('bookingDate')}
          aria-label="Booking date filter"
        />
      </label>

      {/* Submitted Date */}
      <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>Submitted Date</span>
        <input
          type="date"
          className={selectClass}
          value={filters.submittedDate ?? ''}
          onChange={set('submittedDate')}
          aria-label="Submitted date filter"
        />
      </label>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <X size={14} />
          Clear
        </button>
      )}
    </div>
  );
}
