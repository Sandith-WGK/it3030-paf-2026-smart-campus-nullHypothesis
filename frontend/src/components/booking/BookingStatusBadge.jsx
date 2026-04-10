import React from 'react';

const config = {
  PENDING: {
    label: 'Pending',
    className:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300',
  },
  APPROVED: {
    label: 'Approved',
    className:
      'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300',
  },
  REJECTED: {
    label: 'Rejected',
    className:
      'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    className:
      'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400',
  },
};

export default function BookingStatusBadge({ status }) {
  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-zinc-100 text-zinc-600',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
