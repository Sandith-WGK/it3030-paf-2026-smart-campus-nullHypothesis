import React from 'react';
import { CalendarX } from 'lucide-react';

export default function EmptyState({ icon, title, message, action }) {
  const IconCmp = icon || CalendarX;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-5 mb-4">
        <IconCmp size={32} className="text-zinc-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{title}</h3>
      {message && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">{message}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
