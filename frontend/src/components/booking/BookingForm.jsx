import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import resourceService from '../../services/api/resourceService';
import bookingService from '../../services/api/bookingService';
import BookingTimeline from './BookingTimeline';
import ConfirmModal from './ConfirmModal';
import { CalendarDays, Clock, Loader2, Search, ChevronRight, ChevronLeft, Check } from 'lucide-react';

// ─── Time utilities ────────────────────────────────────────────────────────────

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function computeAvailableSlots(bookings, windowStart, windowEnd) {
  const wsMin = timeToMinutes(windowStart);
  const weMin = timeToMinutes(windowEnd);
  // Only APPROVED bookings are treated as occupied — PENDING ones are visible
  // on the timeline (yellow) but don't block slot selection for new requests.
  const occupiedBookings = bookings.filter((b) => b.status === 'APPROVED');
  const sorted = [...occupiedBookings].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const gaps = [];
  let cursor = wsMin;
  for (const b of sorted) {
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    if (bStart > cursor) {
      const gapEnd = Math.min(bStart, weMin);
      if (gapEnd - cursor >= 30) gaps.push({ start: minutesToTime(cursor), end: minutesToTime(gapEnd) });
    }
    cursor = Math.max(cursor, bEnd);
  }
  if (cursor < weMin && weMin - cursor >= 30) {
    gaps.push({ start: minutesToTime(cursor), end: minutesToTime(weMin) });
  }
  return gaps;
}

function generateTimeOptions(start = '07:00', end = '22:00') {
  const opts = [];
  let cur = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  // Use <= so the resource's exact closing time is included as a selectable option (Task 1)
  while (cur <= endMin) {
    opts.push(minutesToTime(cur));
    cur += 30;
  }
  return opts;
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500';
const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';
const errorClass = 'text-xs text-red-500 mt-1';

// ─── Resource type metadata ────────────────────────────────────────────────────

const RESOURCE_TYPES = ['ALL', 'HALL', 'LAB', 'ROOM', 'EQUIPMENT'];
const TYPE_ICONS = { HALL: '🏛️', LAB: '🔬', ROOM: '🚪', EQUIPMENT: '🖥️' };

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < currentStep;
        const active = stepNum === currentStep;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  done
                    ? 'bg-violet-600 text-white'
                    : active
                    ? 'bg-violet-600 text-white ring-4 ring-violet-100 dark:ring-violet-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
              >
                {done ? <Check size={14} /> : stepNum}
              </div>
              <span
                className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${
                  active ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                  done ? 'bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function BookingForm({ initial = {}, onSubmit, loading, submitLabel = 'Submit', fixedResourceId, currentUserId }) {
  const navigate = useNavigate();
  // When editing (fixedResourceId set), skip resource selection and start at date/time.
  const totalSteps = fixedResourceId ? 2 : 3;
  const stepLabels = fixedResourceId
    ? ['Date & Time', 'Details & Review']
    : ['Choose Resource', 'Date & Time', 'Details & Review'];

  const toRealStep = (ui) => (fixedResourceId ? ui + 1 : ui);

  const [uiStep, setUiStep] = useState(1);
  const realStep = toRealStep(uiStep);

  // ── Form state ────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    resourceId: initial.resourceId ?? '',
    date: initial.date ?? '',
    startTime: initial.startTime ?? '',
    endTime: initial.endTime ?? '',
    purpose: initial.purpose ?? '',
    expectedAttendees: initial.expectedAttendees ?? '',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  // ── Resources ─────────────────────────────────────────────────────────────────
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(!fixedResourceId);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [fixedResource, setFixedResource] = useState(null);

  useEffect(() => {
    if (fixedResourceId) {
      resourceService
        .getResourceById(fixedResourceId)
        .then((res) => setFixedResource(res.data?.data ?? res.data ?? null))
        .catch(() => setFixedResource(null));
      return;
    }
    resourceService
      .getResources({ status: 'ACTIVE' })
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        setResources(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setResources([]))
      .finally(() => setResourcesLoading(false));
  }, [fixedResourceId]);

  // Task 4: When in rebooking mode, auto-select the resource and skip straight to step 2
  useEffect(() => {
    if (fixedResourceId || !initial.resourceId || resources.length === 0) return;
    const match = resources.find((r) => r.id === initial.resourceId);
    if (match && !form.resourceId) {
      setField('resourceId', match.id);
      setUiStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources]);

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === form.resourceId) ?? null,
    [resources, form.resourceId],
  );
  const activeResource = fixedResourceId ? fixedResource : selectedResource;
  const activeResourceId = fixedResourceId || form.resourceId;

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchType = typeFilter === 'ALL' || r.type === typeFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.location ?? '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [resources, typeFilter, searchQuery]);

  // ── Schedule & slots ──────────────────────────────────────────────────────────
  const [allBookings, setAllBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (!activeResourceId || !form.date) {
      setSlots([]);
      setAllBookings([]);
      return;
    }
    setSlotsLoading(true);
    bookingService
      .getResourceSchedule(activeResourceId, form.date)
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? [];
        const approved = Array.isArray(raw) ? raw : [];
        setAllBookings(approved);
        const windowStart = activeResource?.availabilityStart ?? '07:00';
        const windowEnd = activeResource?.availabilityEnd ?? '22:00';
        setSlots(computeAvailableSlots(approved, windowStart, windowEnd));
      })
      .catch(() => {
        setAllBookings([]);
        setSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [activeResourceId, form.date, activeResource]);

  // ── Derived: approved-only bookings + slot-specific conflict detection ──────────
  const approvedBookings = useMemo(
    () => allBookings.filter((b) => b.status === 'APPROVED'),
    [allBookings],
  );

  // Exclusive mode: slot is blocked if ANY approved booking overlaps the selected range.
  // false (not null) when no time is selected — the Next button stays enabled until
  // the user picks times and we can legitimately evaluate a conflict.
  // Task 6: use .find() instead of .some() so we can display the exact conflicting reservation times
  const slotBooked = useMemo(() => {
    if (!form.startTime || !form.endTime) return null;
    return (
      approvedBookings.find(
        (b) =>
          String(b.startTime).substring(0, 5) < form.endTime &&
          String(b.endTime).substring(0, 5) > form.startTime,
      ) ?? null
    );
  }, [approvedBookings, form.startTime, form.endTime]);

  // Task 3: Suggest the next available 1-hour and 2-hour blocks
  const suggestedSlots = useMemo(() => {
    if (!activeResource || !form.date) return [];
    const windowStart = String(activeResource?.availabilityStart ?? activeResource?.availableStartTime ?? '07:00').substring(0, 5);
    const windowEnd   = String(activeResource?.availabilityEnd   ?? activeResource?.availableEndTime   ?? '22:00').substring(0, 5);
    const wsMin = timeToMinutes(windowStart);
    const weMin = timeToMinutes(windowEnd);
    const occupied = approvedBookings.map((b) => ({
      start: timeToMinutes(String(b.startTime).substring(0, 5)),
      end:   timeToMinutes(String(b.endTime).substring(0, 5)),
    }));
    const isFree = (s, e) => !occupied.some((o) => o.start < e && o.end > s);
    const suggestions = [];
    for (const duration of [60, 120]) {
      let cursor = wsMin;
      while (cursor + duration <= weMin) {
        if (isFree(cursor, cursor + duration)) {
          suggestions.push({ start: minutesToTime(cursor), end: minutesToTime(cursor + duration), label: duration === 60 ? '1 hr' : '2 hrs' });
          break;
        }
        cursor += 30;
      }
    }
    return suggestions;
  }, [approvedBookings, activeResource, form.date]);

  // ── Duplicate booking detection ──────────────────────────────────────────────────
  // Finds the current user's own PENDING/APPROVED booking that overlaps the
  // selected slot. Only active on the new-booking flow (not edit).
  const [duplicateBooking, setDuplicateBooking] = useState(null);

  const userDuplicate = useMemo(() => {
    if (!currentUserId || !form.startTime || !form.endTime) return null;
    return (
      allBookings.find(
        (b) =>
          (b.userId === currentUserId || b.userId === String(currentUserId)) &&
          (b.status === 'PENDING' || b.status === 'APPROVED') &&
          String(b.startTime).substring(0, 5) < form.endTime &&
          String(b.endTime).substring(0, 5) > form.startTime,
      ) ?? null
    );
  }, [allBookings, currentUserId, form.startTime, form.endTime]);

  // ── Validation ────────────────────────────────────────────────────────────────
  const validateStep = (step) => {
    const e = {};
    if (step === 1 && !fixedResourceId) {
      if (!form.resourceId) e.resourceId = 'Please select a resource';
    }
    if (step === 2) {
      if (!form.date) e.date = 'Date is required';
      if (!form.startTime) e.startTime = 'Start time is required';
      if (!form.endTime) e.endTime = 'End time is required';
      if (form.startTime && form.endTime && form.startTime >= form.endTime)
        e.endTime = 'End time must be after start time';
      // Past-time guard: if the selected date is today, start time must be in the future
      if (form.date && form.startTime) {
        const nowDate = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toTimeString().slice(0, 5);
        if (form.date === nowDate && form.startTime <= nowTime)
          e.startTime = 'Start time must be in the future for today.';
        if (form.date < nowDate)
          e.date = 'Cannot book a date in the past.';
      }
      if (slotBooked)
        e.slot = `⛔ This conflicts with an existing reservation from ${slotBooked.startTime} to ${slotBooked.endTime}. Please choose a different time.`;
    }
    if (step === 3) {
      if (!form.purpose || form.purpose.trim().length < 5)
        e.purpose = 'Purpose must be at least 5 characters';
      if (form.purpose && form.purpose.length > 500)
        e.purpose = 'Purpose must be at most 500 characters';
      if (form.expectedAttendees && Number(form.expectedAttendees) < 1)
        e.expectedAttendees = 'Must be a positive number';
      if (
        activeResource?.capacity &&
        form.expectedAttendees &&
        Number(form.expectedAttendees) > activeResource.capacity
      ) {
        e.expectedAttendees = `Exceeds capacity (${activeResource.capacity})`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(realStep)) return;
    // Duplicate booking guard — only on new booking creation (not edit flow)
    if (realStep === 2 && !fixedResourceId && userDuplicate) {
      setDuplicateBooking(userDuplicate);
      return;
    }
    setUiStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => {
    setErrors({});
    setUiStep((s) => Math.max(s - 1, 1));
  };

  // Track in-flight submission to prevent double-tap
  const [submitting, setSubmitting] = useState(false);

  const handleFinalSubmit = () => {
    if (!validateStep(3)) return;
    if (submitting) return; // guard against double-tap
    setSubmitting(true);
    const payload = {
      ...(fixedResourceId ? {} : { resourceId: form.resourceId }),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      purpose: form.purpose.trim(),
      expectedAttendees: form.expectedAttendees ? Number(form.expectedAttendees) : null,
    };
    Promise.resolve(onSubmit(payload)).finally(() => setSubmitting(false));
  };

  const today = new Date().toISOString().split('T')[0];
  const selectedRange =
    form.startTime && form.endTime ? { start: form.startTime, end: form.endTime } : null;

  // ── Calendar popover ──────────────────────────────────────────────────────────
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [calendarOpen]);

  const handleDateSelect = (date) => {
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      setField('date', `${y}-${m}-${d}`);
      setCalendarOpen(false);
    }
  };

  // ── Time dropdowns ────────────────────────────────────────────────────────────
  const timeOptions = useMemo(() => {
    const s = String(activeResource?.availabilityStart ?? '07:00').substring(0, 5);
    const e = String(activeResource?.availabilityEnd ?? '22:00').substring(0, 5);
    return generateTimeOptions(s, e);
  }, [activeResource]);

  const endTimeOptions = useMemo(
    () => (form.startTime ? timeOptions.filter((t) => t > form.startTime) : timeOptions),
    [timeOptions, form.startTime],
  );

  return (
    // Task 5 & Date Picker Fix: flex-col so the sticky action bar stays pinned at the bottom, h-full and relative for proper layout boundaries
    <div className="flex flex-col h-full relative">
      <StepIndicator steps={stepLabels} currentStep={uiStep} />

      <AnimatePresence mode="wait">
        {/* ── Step 1: Resource Selection ── */}
        {realStep === 1 && (
          <motion.div
            key="step-resource"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
          >
            {/* Type filter chips */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {RESOURCE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    typeFilter === t
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : `${TYPE_ICONS[t] ?? ''} ${t}`}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search by name or location…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>

            {/* Resource cards */}
            {resourcesLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400 py-6">
                <Loader2 size={16} className="animate-spin" /> Loading resources…
              </div>
            ) : filteredResources.length === 0 ? (
              <p className="text-sm text-zinc-500 italic py-6">
                No resources match your filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {filteredResources.map((r) => {
                  const isSelected = form.resourceId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setField('resourceId', r.id);
                        // Auto-advance to next step on selection
                        setTimeout(() => setUiStep(2), 120);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 dark:border-violet-500'
                          : 'border-zinc-200 bg-white hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-violet-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none shrink-0">
                          {TYPE_ICONS[r.type] ?? '📦'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-semibold text-sm truncate ${
                              isSelected
                                ? 'text-violet-700 dark:text-violet-300'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {r.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {r.type} · {r.location}
                          </p>
                          {r.capacity && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                              Capacity: {r.capacity}
                            </p>
                          )}
                          {r.availabilityStart && r.availabilityEnd && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                              Available: {r.availabilityStart}–{r.availabilityEnd}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check
                            size={15}
                            className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.resourceId && <p className={errorClass}>{errors.resourceId}</p>}
          </motion.div>
        )}

        {/* ── Step 2: Date & Time ── */}
        {realStep === 2 && (
          <motion.div
            key="step-datetime"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="space-y-5 pb-48" /* Added pb-48 to ensure the popover calendar doesn't get clipped and can open fully */
          >
            {/* Selected resource summary */}
            {activeResource && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-4 py-3 flex items-center gap-3">
                <span className="text-xl leading-none">
                  {TYPE_ICONS[activeResource.type] ?? '📦'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                    {activeResource.name}
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400">
                    {activeResource.type} · {activeResource.location}
                    {activeResource.capacity ? ` · Cap: ${activeResource.capacity}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* ── Calendar date picker ── */}
            <div className="relative z-50">
              <label className={labelClass}>Date *</label>
              <div className="relative" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((o) => !o)}
                  className={`${inputClass} text-left flex items-center gap-2 cursor-pointer`}
                >
                  <CalendarDays size={16} className="text-violet-500 shrink-0" />
                  <span className={form.date ? '' : 'text-zinc-400 dark:text-zinc-500'}>
                    {form.date
                      ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Choose a date…'}
                  </span>
                </button>

                {calendarOpen && (
                  <div
                    className="absolute z-50 top-full mt-1 left-0 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl overflow-hidden"
                    style={{
                      '--rdp-accent-color': '#7c3aed',
                      '--rdp-accent-background-color': '#ede9fe',
                    }}
                  >
                    <DayPicker
                      mode="single"
                      selected={form.date ? new Date(form.date + 'T00:00:00') : undefined}
                      onSelect={handleDateSelect}
                      disabled={{ before: new Date(today) }}
                    />
                  </div>
                )}
              </div>
              {errors.date && <p className={errorClass}>{errors.date}</p>}
            </div>

            {/* ── Time dropdowns — above the timeline so they act as input ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  <Clock size={13} className="inline mr-1 text-zinc-400" />
                  Start Time *
                </label>
                <select
                  className={inputClass}
                  value={form.startTime}
                  onChange={(e) => {
                    set('startTime')(e);
                    if (form.endTime && e.target.value >= form.endTime) {
                      setField('endTime', '');
                    }
                  }}
                >
                  <option value="">-- Select --</option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.startTime && <p className={errorClass}>{errors.startTime}</p>}
              </div>
              <div>
                <label className={labelClass}>
                  <Clock size={13} className="inline mr-1 text-zinc-400" />
                  End Time *
                </label>
                <select
                  className={inputClass}
                  value={form.endTime}
                  onChange={set('endTime')}
                  disabled={!form.startTime}
                >
                  <option value="">-- Select --</option>
                  {endTimeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.endTime && <p className={errorClass}>{errors.endTime}</p>}
              </div>
            </div>

            {/* ── Timeline + capacity feedback (shown once date is chosen) ── */}
            {activeResourceId && form.date && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Loader2 size={12} className="animate-spin" /> Checking availability…
                  </div>
                ) : (
                  <>
                    <BookingTimeline
                      bookings={approvedBookings}
                      selectedRange={selectedRange}
                      slotBooked={!!slotBooked}
                      availableStartTime={String(activeResource?.availabilityStart ?? activeResource?.availableStartTime ?? '07:00').substring(0, 5)}
                      availableEndTime={String(activeResource?.availabilityEnd ?? activeResource?.availableEndTime ?? '22:00').substring(0, 5)}
                    />

                    {/* Task 6: Slot booked — show exact conflicting reservation times */}
                    {slotBooked && (
                      <p className="text-xs text-red-500 mt-3 font-medium">
                        ⛔ This conflicts with an existing reservation from{' '}
                        <span className="font-bold">{slotBooked.startTime}</span> to{' '}
                        <span className="font-bold">{slotBooked.endTime}</span>. Please choose a different time.
                      </p>
                    )}

                    {/* Generic slot error from validateStep */}
                    {errors.slot && !slotBooked && (
                      <p className={`${errorClass} mt-2`}>{errors.slot}</p>
                    )}

                    {/* Task 3: Quick-pick — 1h and 2h suggested blocks */}
                    {suggestedSlots.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                          Suggested slots
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {suggestedSlots.map((slot) => {
                            const isSelected =
                              form.startTime === slot.start && form.endTime === slot.end;
                            return (
                              <button
                                key={`${slot.start}-${slot.end}`}
                                type="button"
                                onClick={() => {
                                  setField('startTime', slot.start);
                                  setField('endTime', slot.end);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20'
                                }`}
                              >
                                {slot.start} – {slot.end}
                                <span className="ml-1 opacity-60">({slot.label})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* All free windows */}
                    {slots.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                          All free windows
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot) => {
                            const isSelected =
                              form.startTime === slot.start && form.endTime === slot.end;
                            return (
                              <button
                                key={`${slot.start}-${slot.end}`}
                                type="button"
                                onClick={() => {
                                  setField('startTime', slot.start);
                                  setField('endTime', slot.end);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                                }`}
                              >
                                {slot.start} – {slot.end}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      !slotBooked && (
                        <p className="text-xs mt-3 font-medium">
                          {approvedBookings.length > 0 ? (
                            <span className="text-red-500">No completely free slots remaining on this date.</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ✓ Fully available — pick any time above.
                            </span>
                          )}
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Step 3: Details & Review ── */}
        {realStep === 3 && (
          <motion.div
            key="step-details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Purpose */}
            <div>
              <label className={labelClass}>Purpose *</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Briefly describe the purpose of this booking…"
                value={form.purpose}
                onChange={set('purpose')}
                maxLength={500}
              />
              <div className="flex justify-between">
                {errors.purpose ? (
                  <p className={errorClass}>{errors.purpose}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-zinc-400 mt-1">{form.purpose.length}/500</p>
              </div>
            </div>

            {/* Expected Attendees */}
            <div>
              <label className={labelClass}>Expected Attendees</label>
              <input
                type="number"
                className={inputClass}
                min={1}
                placeholder="e.g. 20"
                value={form.expectedAttendees}
                onChange={set('expectedAttendees')}
              />
              {errors.expectedAttendees && (
                <p className={errorClass}>{errors.expectedAttendees}</p>
              )}
            </div>

            {/* Booking summary review */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Booking Summary
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Resource</p>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {activeResource?.name ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Location</p>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {activeResource?.location ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Date</p>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {form.date || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Time</p>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {form.startTime && form.endTime
                      ? `${form.startTime} – ${form.endTime}`
                      : '—'}
                  </p>
                </div>
                {form.expectedAttendees && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-0.5">Attendees</p>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      {form.expectedAttendees}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task 5: Sticky bottom action bar — always visible without scrolling. Uses z-20 to stay under the z-50 calendar popover */}
      <div className={`flex mt-6 sticky bottom-0 z-20 bg-white dark:bg-gray-800 p-4 border-t border-zinc-200 dark:border-zinc-700 -mx-1 rounded-b-2xl ${uiStep > 1 ? 'justify-between' : 'justify-end'}`}>
        {uiStep > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}

        {uiStep < totalSteps ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={realStep === 2 && slotBooked}
            className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors ${
              realStep === 2 && slotBooked
                ? 'bg-violet-300 dark:bg-violet-800 cursor-not-allowed opacity-60'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={loading || submitting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {submitLabel}
          </button>
        )}
      </div>

      {/* ── Duplicate booking interception modal ── */}
      <ConfirmModal
        open={!!duplicateBooking}
        onClose={() => {
          setDuplicateBooking(null);
          // Clear time selection so user picks a fresh slot
          setField('startTime', '');
          setField('endTime', '');
        }}
        onConfirm={() => {
          navigate(`/bookings/${duplicateBooking.id}/edit`);
        }}
        title="Existing Booking Found"
        message={`You already have a ${duplicateBooking?.status?.toLowerCase()} booking for this resource on ${duplicateBooking?.date} (${duplicateBooking?.startTime}\u2013${duplicateBooking?.endTime}). Would you like to edit your existing booking instead?`}
        confirmLabel="Edit Existing Booking"
        cancelLabel="Choose Different Time"
        confirmVariant="primary"
      />
    </div>
  );
}
