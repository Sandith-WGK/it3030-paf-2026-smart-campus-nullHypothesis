import React from 'react';

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex-1 h-4 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="w-16 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="h-3 rounded bg-zinc-100 dark:bg-zinc-800 w-3/4" />
      <div className="h-3 rounded bg-zinc-100 dark:bg-zinc-800 w-1/2" />
      <div className="h-3 rounded bg-zinc-100 dark:bg-zinc-800 w-2/3" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
