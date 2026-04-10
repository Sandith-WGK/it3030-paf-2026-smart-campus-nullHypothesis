import React, { useEffect, useMemo, useState } from 'react';
import resourceService from '../../services/api/resourceService';
import { Loader2 } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500';

const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';
const errorClass = 'text-xs text-red-500 mt-1';

export default function BookingForm({ initial = {}, onSubmit, loading, submitLabel = 'Submit', fixedResourceId }) {
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(!fixedResourceId);

  const [form, setForm] = useState({
    resourceId: initial.resourceId ?? '',
    date: initial.date ?? '',
    startTime: initial.startTime ?? '',
    endTime: initial.endTime ?? '',
    purpose: initial.purpose ?? '',
    expectedAttendees: initial.expectedAttendees ?? '',
  });
  const [errors, setErrors] = useState({});

  // Derive selected resource from the resources list and current selection
  const selectedResource = useMemo(
    () => resources.find((r) => r.id === form.resourceId) ?? null,
    [resources, form.resourceId],
  );

  // Load resources for the picker (only when no fixed resource)
  useEffect(() => {
    if (fixedResourceId) return;
    resourceService
      .getResources({ status: 'ACTIVE' })
      .then((res) => {
        // Defensively ensure we always set an array regardless of response shape
        const raw = res.data?.data ?? res.data;
        setResources(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setResources([]))
      .finally(() => setResourcesLoading(false));
  }, [fixedResourceId]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!fixedResourceId && !form.resourceId) e.resourceId = 'Please select a resource';
    if (!form.date) e.date = 'Date is required';
    if (!form.startTime) e.startTime = 'Start time is required';
    if (!form.endTime) e.endTime = 'End time is required';
    if (form.startTime && form.endTime && form.startTime >= form.endTime)
      e.endTime = 'End time must be after start time';
    if (!form.purpose || form.purpose.trim().length < 5)
      e.purpose = 'Purpose must be at least 5 characters';
    if (form.purpose && form.purpose.length > 500)
      e.purpose = 'Purpose must be at most 500 characters';
    if (form.expectedAttendees && Number(form.expectedAttendees) < 1)
      e.expectedAttendees = 'Must be a positive number';
    if (
      selectedResource?.capacity &&
      form.expectedAttendees &&
      Number(form.expectedAttendees) > selectedResource.capacity
    ) {
      e.expectedAttendees = `Exceeds capacity (${selectedResource.capacity})`;
    }
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const payload = {
      ...(fixedResourceId ? {} : { resourceId: form.resourceId }),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      purpose: form.purpose.trim(),
      expectedAttendees: form.expectedAttendees ? Number(form.expectedAttendees) : null,
    };
    onSubmit(payload);
  };

  // Group resources by type
  const grouped = resources.reduce((acc, r) => {
    (acc[r.type] = acc[r.type] ?? []).push(r);
    return acc;
  }, {});

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Resource picker */}
      {!fixedResourceId && (
        <div>
          <label className={labelClass}>Resource *</label>
          {resourcesLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 size={14} className="animate-spin" /> Loading resources…
            </div>
          ) : (
            <select className={inputClass} value={form.resourceId} onChange={set('resourceId')}>
              <option value="">Select a resource</option>
              {Object.entries(grouped).map(([type, items]) => (
                <optgroup key={type} label={type}>
                  {items.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.location}
                      {r.capacity ? ` (cap: ${r.capacity})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {errors.resourceId && <p className={errorClass}>{errors.resourceId}</p>}

          {/* Resource info card */}
          {selectedResource && (
            <div className="mt-2 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-4 py-3 text-xs text-violet-800 dark:text-violet-300 space-y-1">
              <p>
                <span className="font-semibold">Location:</span> {selectedResource.location}
              </p>
              {selectedResource.capacity && (
                <p>
                  <span className="font-semibold">Capacity:</span> {selectedResource.capacity}
                </p>
              )}
              {selectedResource.availabilityStart && selectedResource.availabilityEnd && (
                <p>
                  <span className="font-semibold">Available:</span>{' '}
                  {selectedResource.availabilityStart} – {selectedResource.availabilityEnd}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Date */}
      <div>
        <label className={labelClass}>Date *</label>
        <input type="date" className={inputClass} min={today} value={form.date} onChange={set('date')} />
        {errors.date && <p className={errorClass}>{errors.date}</p>}
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start Time *</label>
          <input type="time" className={inputClass} value={form.startTime} onChange={set('startTime')} />
          {errors.startTime && <p className={errorClass}>{errors.startTime}</p>}
        </div>
        <div>
          <label className={labelClass}>End Time *</label>
          <input type="time" className={inputClass} value={form.endTime} onChange={set('endTime')} />
          {errors.endTime && <p className={errorClass}>{errors.endTime}</p>}
        </div>
      </div>

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
        {errors.expectedAttendees && <p className={errorClass}>{errors.expectedAttendees}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm transition-colors"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
