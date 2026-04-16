import React from 'react';

const STATUS_COLORS = {
  APPROVED: 'bg-green-500',
  PENDING: 'bg-yellow-400',
  CANCELLED: 'bg-zinc-400',
  REJECTED: 'bg-red-400',
};

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const DAY_START = 7 * 60;  // 07:00
const DAY_END = 22 * 60;   // 22:00
const DAY_SPAN = DAY_END - DAY_START;

const HOUR_MARKS = Array.from({ length: 16 }, (_, i) => i + 7); // 07 – 22

export default function BookingTimeline({ bookings = [], highlightId, selectedRange }) {
  const selectedStart = selectedRange ? timeToMinutes(selectedRange.start) : null;
  const selectedEnd = selectedRange ? timeToMinutes(selectedRange.end) : null;
  const selectedValid =
    selectedStart !== null &&
    selectedEnd !== null &&
    selectedEnd > selectedStart &&
    selectedStart >= DAY_START &&
    selectedEnd <= DAY_END;

  const selectedLeft = selectedValid
    ? ((selectedStart - DAY_START) / DAY_SPAN) * 100
    : 0;
  const selectedWidth = selectedValid
    ? ((selectedEnd - selectedStart) / DAY_SPAN) * 100
    : 0;

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
        Day Timeline
      </p>

      {/* Track */}
      <div className="relative h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {/* Existing bookings */}
        {bookings.map((b) => {
          const start = timeToMinutes(b.startTime);
          const end = timeToMinutes(b.endTime);
          const left = ((start - DAY_START) / DAY_SPAN) * 100;
          const width = ((end - start) / DAY_SPAN) * 100;
          const color = STATUS_COLORS[b.status] ?? 'bg-zinc-400';
          const isHighlight = b.id === highlightId;

          return (
            <div
              key={b.id}
              title={`${b.resourceName ?? ''} ${b.startTime}–${b.endTime} (${b.status})`}
              className={`absolute top-1 bottom-1 rounded ${color} ${
                isHighlight ? 'ring-2 ring-violet-600 ring-offset-1' : 'opacity-80'
              }`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }}
            />
          );
        })}

        {/* Selected range overlay */}
        {selectedValid && (
          <div
            title={`Your selection: ${selectedRange.start}–${selectedRange.end}`}
            className="absolute top-0 bottom-0 bg-violet-500/40 border-2 border-violet-500 rounded"
            style={{ left: `${selectedLeft}%`, width: `${Math.max(selectedWidth, 0.8)}%` }}
          />
        )}
      </div>

      {/* Hour labels */}
      <div className="relative flex mt-1">
        {HOUR_MARKS.map((h) => {
          const pos = ((h * 60 - DAY_START) / DAY_SPAN) * 100;
          return (
            <span
              key={h}
              className="absolute text-[10px] text-zinc-400 dark:text-zinc-500 -translate-x-1/2"
              style={{ left: `${pos}%` }}
            >
              {String(h).padStart(2, '0')}
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-5 text-xs text-zinc-500 dark:text-zinc-400">
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm ${c}`} />
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </span>
        ))}
        {selectedValid && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-violet-500/40 border border-violet-500" />
            Your selection
          </span>
        )}
      </div>
    </div>
  );
}
