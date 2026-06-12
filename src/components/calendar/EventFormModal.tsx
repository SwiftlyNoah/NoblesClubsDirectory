import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import {
  WEEKDAY_LABELS,
  buildRRuleString,
  createEvent,
  deleteEvent,
  parseRRuleString,
  updateEvent,
  type ClubEventWithId,
  type ClubWithId,
  type Frequency,
  type NewEvent,
} from '../../data';
import { Modal } from '../Modal';

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Existing event when editing; null when creating. */
  event: ClubEventWithId | null;
  /** Clubs the user may create events for (all active clubs for admins). */
  clubs: ClubWithId[];
  /** Pre-filled date for new events (e.g. from a calendar date click). */
  initialDate?: Date | null;
  /** Called after a successful save or delete so the page can refetch. */
  onSaved: () => void;
}

type FreqChoice = 'none' | Frequency;
type EndChoice = 'never' | 'until' | 'count';

const DAY_MS = 24 * 60 * 60 * 1000;
const FREQ_UNITS: Record<Frequency, string> = {
  daily: 'day(s)',
  weekly: 'week(s)',
  monthly: 'month(s)',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Weekday of a yyyy-mm-dd date input, rrule convention (0 = Monday). */
function rruleWeekdayOf(dateInput: string): number {
  const date = new Date(`${dateInput}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : (date.getDay() + 6) % 7;
}

export function EventFormModal({
  open,
  onClose,
  event,
  clubs,
  initialDate = null,
  onSaved,
}: EventFormModalProps) {
  const { uid } = useAuth();

  const [clubId, setClubId] = useState('');
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [externalLink, setExternalLink] = useState('');

  const [freq, setFreq] = useState<FreqChoice>('none');
  const [interval, setIntervalValue] = useState(1);
  const [byweekday, setByweekday] = useState<number[]>([]);
  const [endChoice, setEndChoice] = useState<EndChoice>('never');
  const [untilDate, setUntilDate] = useState('');
  const [count, setCount] = useState(10);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (Re-)initialize whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    if (event) {
      setClubId(event.clubId);
      setTitle(event.title);
      setAllDay(Boolean(event.allDay));
      const eventStart = new Date(event.start);
      setDate(toDateInput(eventStart));
      setStartTime(toTimeInput(eventStart));
      setEndTime(toTimeInput(new Date(event.end)));
      setLocation(event.location ?? '');
      setDescription(event.description ?? '');
      setExternalLink(event.externalLink ?? '');
      const recurrence = event.isRecurring ? parseRRuleString(event.rrule) : null;
      setFreq(recurrence?.freq ?? 'none');
      setIntervalValue(recurrence?.interval ?? 1);
      setByweekday(recurrence?.byweekday ?? []);
      setEndChoice(recurrence?.until ? 'until' : recurrence?.count ? 'count' : 'never');
      setUntilDate(recurrence?.until ? toDateInput(new Date(recurrence.until)) : '');
      setCount(recurrence?.count ?? 10);
    } else {
      setClubId('');
      setTitle('');
      setAllDay(false);
      setDate(toDateInput(initialDate ?? new Date()));
      setStartTime('12:00');
      setEndTime('13:00');
      setLocation('');
      setDescription('');
      setExternalLink('');
      setFreq('none');
      setIntervalValue(1);
      setByweekday([]);
      setEndChoice('never');
      setUntilDate('');
      setCount(10);
    }
    setSaving(false);
    setError(null);
  }, [open, event, initialDate]);

  const startMs = useMemo(() => {
    if (!date) return null;
    const value = new Date(allDay ? `${date}T00:00:00` : `${date}T${startTime}`);
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }, [date, startTime, allDay]);

  const endMs = useMemo(() => {
    if (startMs === null) return null;
    if (allDay) return startMs + DAY_MS;
    const value = new Date(`${date}T${endTime}`);
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }, [startMs, allDay, date, endTime]);

  const valid =
    clubId !== '' &&
    title.trim() !== '' &&
    startMs !== null &&
    endMs !== null &&
    endMs > startMs &&
    (freq !== 'weekly' || byweekday.length > 0) &&
    (freq === 'none' || endChoice !== 'until' || untilDate !== '') &&
    (freq === 'none' || endChoice !== 'count' || count >= 1);

  // The edited event's club may be missing from the picker list (e.g. now inactive).
  const fallbackClub = event && !clubs.some((club) => club.id === event.clubId) ? event : null;

  const handleFreqChange = (next: FreqChoice) => {
    setFreq(next);
    if (next === 'weekly' && byweekday.length === 0 && date) {
      setByweekday([rruleWeekdayOf(date)]);
    }
  };

  const toggleWeekday = (day: number) => {
    setByweekday((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async () => {
    if (!valid || saving || startMs === null || endMs === null) return;
    const selectedClub = clubs.find((club) => club.id === clubId);
    let rrule: string | undefined;
    if (freq !== 'none') {
      rrule = buildRRuleString({
        freq,
        interval,
        byweekday: freq === 'weekly' ? byweekday : [],
        until:
          endChoice === 'until' && untilDate ? new Date(`${untilDate}T23:59:59`).getTime() : null,
        count: endChoice === 'count' ? count : null,
      });
    }
    const data: NewEvent = {
      title: title.trim(),
      clubId,
      clubName: selectedClub?.name ?? event?.clubName ?? '',
      clubSubject: selectedClub?.subject ?? event?.clubSubject ?? '',
      start: startMs,
      end: endMs,
      allDay,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      externalLink: externalLink.trim() || undefined,
      isRecurring: freq !== 'none',
      rrule,
      duration: freq !== 'none' ? endMs - startMs : undefined,
    };

    setSaving(true);
    setError(null);
    try {
      if (event) {
        await updateEvent(event.id, { ...data, createdBy: event.createdBy, createdAt: event.createdAt });
      } else {
        if (!uid) throw new Error('Not signed in');
        await createEvent(data, uid);
      }
      onSaved();
      onClose();
    } catch (saveError) {
      console.error('Failed to save event:', saveError);
      setError('Failed to save the event. Please try again.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || saving) return;
    if (!window.confirm('Delete this event? All of its occurrences will be removed.')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteEvent(event.id);
      onSaved();
      onClose();
    } catch (deleteError) {
      console.error('Failed to delete event:', deleteError);
      setError('Failed to delete the event. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={event ? 'Edit event' : 'New event'} width={560}>
      <div className="event-form">
        <div className="event-form-field">
          <label className="form-label" htmlFor="event-club">
            Club
          </label>
          <select
            id="event-club"
            className="select-field"
            value={clubId}
            onChange={(changeEvent) => setClubId(changeEvent.target.value)}
            disabled={event !== null}
          >
            <option value="">Select a club…</option>
            {fallbackClub && <option value={fallbackClub.clubId}>{fallbackClub.clubName}</option>}
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        <div className="event-form-field">
          <label className="form-label" htmlFor="event-title">
            Title
          </label>
          <input
            id="event-title"
            className="text-field"
            type="text"
            placeholder="Event title"
            value={title}
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          />
        </div>

        <label className="event-form-check">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(changeEvent) => setAllDay(changeEvent.target.checked)}
          />
          All-day event
        </label>

        <div className="event-form-row">
          <div className="event-form-field">
            <label className="form-label" htmlFor="event-date">
              Date
            </label>
            <input
              id="event-date"
              className="text-field"
              type="date"
              value={date}
              onChange={(changeEvent) => setDate(changeEvent.target.value)}
            />
          </div>
          {!allDay && (
            <>
              <div className="event-form-field">
                <label className="form-label" htmlFor="event-start-time">
                  Start
                </label>
                <input
                  id="event-start-time"
                  className="text-field"
                  type="time"
                  value={startTime}
                  onChange={(changeEvent) => setStartTime(changeEvent.target.value)}
                />
              </div>
              <div className="event-form-field">
                <label className="form-label" htmlFor="event-end-time">
                  End
                </label>
                <input
                  id="event-end-time"
                  className="text-field"
                  type="time"
                  value={endTime}
                  onChange={(changeEvent) => setEndTime(changeEvent.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="event-form-field">
          <label className="form-label" htmlFor="event-location">
            Location
          </label>
          <input
            id="event-location"
            className="text-field"
            type="text"
            placeholder="Room number or location"
            value={location}
            onChange={(changeEvent) => setLocation(changeEvent.target.value)}
          />
        </div>

        <div className="event-form-field">
          <label className="form-label" htmlFor="event-description">
            Description
          </label>
          <textarea
            id="event-description"
            className="text-area"
            placeholder="Event description (optional)"
            value={description}
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
          />
        </div>

        <div className="event-form-field">
          <label className="form-label" htmlFor="event-link">
            External link
          </label>
          <input
            id="event-link"
            className="text-field"
            type="url"
            placeholder="https://… (optional)"
            value={externalLink}
            onChange={(changeEvent) => setExternalLink(changeEvent.target.value)}
          />
        </div>

        <div className="event-form-field">
          <label className="form-label" htmlFor="event-repeat">
            Repeats
          </label>
          <select
            id="event-repeat"
            className="select-field"
            value={freq}
            onChange={(changeEvent) => handleFreqChange(changeEvent.target.value as FreqChoice)}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {freq !== 'none' && (
          <div className="event-form-recurrence">
            {freq === 'weekly' && (
              <div className="event-form-weekdays">
                {WEEKDAY_LABELS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`chip${byweekday.includes(index) ? ' selected' : ''}`}
                    onClick={() => toggleWeekday(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <label className="event-form-interval-row">
              Every
              <input
                className="text-field event-form-interval"
                type="number"
                min={1}
                value={interval}
                onChange={(changeEvent) =>
                  setIntervalValue(Math.max(1, Number(changeEvent.target.value) || 1))
                }
              />
              {FREQ_UNITS[freq]}
            </label>

            <div className="event-form-field">
              <span className="form-label">Ends</span>
              <label className="event-form-radio">
                <input
                  type="radio"
                  name="event-recurrence-end"
                  checked={endChoice === 'never'}
                  onChange={() => setEndChoice('never')}
                />
                Never
              </label>
              <label className="event-form-radio">
                <input
                  type="radio"
                  name="event-recurrence-end"
                  checked={endChoice === 'until'}
                  onChange={() => setEndChoice('until')}
                />
                On date
                <input
                  className="text-field event-form-until"
                  type="date"
                  value={untilDate}
                  onChange={(changeEvent) => {
                    setEndChoice('until');
                    setUntilDate(changeEvent.target.value);
                  }}
                  disabled={endChoice !== 'until'}
                />
              </label>
              <label className="event-form-radio">
                <input
                  type="radio"
                  name="event-recurrence-end"
                  checked={endChoice === 'count'}
                  onChange={() => setEndChoice('count')}
                />
                After
                <input
                  className="text-field event-form-interval"
                  type="number"
                  min={1}
                  value={count}
                  onChange={(changeEvent) => {
                    setEndChoice('count');
                    setCount(Math.max(1, Number(changeEvent.target.value) || 1));
                  }}
                  disabled={endChoice !== 'count'}
                />
                occurrences
              </label>
            </div>
          </div>
        )}

        {error && <p className="event-form-error">{error}</p>}

        <div className="event-form-actions">
          {event && (
            <button className="btn-destructive event-form-delete" onClick={handleDelete} disabled={saving}>
              Delete
            </button>
          )}
          <button className="btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
