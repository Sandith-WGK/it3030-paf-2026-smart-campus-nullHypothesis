import React from 'react';

// Only APPROVED bookings are shown — displayed as "Reserved" blocks.
const RESERVED_COLOR = 'bg-green-500';
const RESERVED_TEXT_COLOR = 'text-white';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const DAY_START = 7 * 60;  // 07:00
const DAY_END = 22 * 60;   // 22:00
const DAY_SPAN = DAY_END - DAY_START;

const HOUR_MARKS = Array.from({ length: 16 }, (_, i) => i + 7); // 07 – 22

/**
 * Props:
 *  bookings      – APPROVED-only booking list (filtered by parent)
 *  highlightId   – optional booking id to ring-highlight
 *  selectedRange – { start: 'HH:MM', end: 'HH:MM' } for the violet overlay
 *  slotBooked    – boolean: true if any approved booking overlaps the selected range
 */
export default function BookingTimeline({ bookings = [], highlightId, selectedRange, slotBooked }) {
  const selectedStart = selectedRange ? timeToMinutes(selectedRange.start) : null;
  const selectedEnd   = selectedRange ? timeToMinutes(selectedRange.end)   : null;
  const selectedValid =
    selectedStart !== null &&
    selectedEnd   !== null &&
    selectedEnd > selectedStart &&
    selectedStart >= DAY_START &&
    selectedEnd   <= DAY_END;

  const selectedLeft  = selectedValid ? ((selectedStart - DAY_START) / DAY_SPAN) * 100 : 0;
  const selectedWidth = selectedValid ? ((selectedEnd - selectedStart) / DAY_SPAN) * 100 : 0;

  // Status indicator — only shown after a valid slot is selected
  const showStatus = selectedValid && slotBooked !== undefined;

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
        Day Timeline
      </p>

      {/* Track */}
      <div className="relative h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {/* Reserved blocks (APPROVED bookings only) */}
        {bookings.map((b) => {
          const start = timeToMinutes(b.startTime);
          const end   = timeToMinutes(b.endTime);
          const left  = ((start - DAY_START) / DAY_SPAN) * 100;
          const width = ((end - start) / DAY_SPAN) * 100;
          const isHighlight = b.id === highlightId;
          // Show attendee count label only if block is wide enough (>4% of track)
          const showLabel = width > 4 && b.expectedAttendees != null;

          return (
            <div
              key={b.id}
              title={`Reserved · ${b.startTime}–${b.endTime} · ${b.expectedAttendees ?? '?'} attendees`}
              className={`absolute top-1 bottom-1 rounded flex items-center justify-center overflow-hidden ${RESERVED_COLOR} ${
                isHighlight ? 'ring-2 ring-violet-600 ring-offset-1' : 'opacity-80'
              }`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }}
            >
              {showLabel && (
                <span className={`text-[10px] font-bold leading-none select-none px-0.5 ${RESERVED_TEXT_COLOR}`}>
                  {b.expectedAttendees}
                </span>
              )}
            </div>
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

      {/* Slot status indicator — shown after user selects a start + end time */}
      {showStatus && (
        <div className="mt-5 mb-1">
          {slotBooked ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3 py-2">
              <span className="text-red-500 text-sm">⛔</span>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                Slot Reserved — this time is already taken
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 px-3 py-2">
              <span className="text-green-500 text-sm">✓</span>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                Slot Available — this time is free to book
              </span>
            </div>
          )}
        </div>
      )}

      {/* Legend — simplified to Reserved + Your selection only */}
      <div className={`flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400 ${showStatus ? 'mt-2' : 'mt-5'}`}>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block w-3 h-3 rounded-sm ${RESERVED_COLOR}`} />
          Reserved
        </span>
        {selectedValid && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-violet-500/40 border border-violet-500" />
            Your selection
          </span>
        )}
        {bookings.some((b) => b.expectedAttendees != null) && (
          <span className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 italic">
            Numbers = attendees
          </span>
        )}
      </div>
    </div>
  );
}
