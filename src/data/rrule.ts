// Single recurrence utility for club events, shared by the website and the
// app. Built on the `rrule` package — no hand-rolled RRULE string parsing.
//
// Convention (normalizes the old Vue WIP's inconsistency): an event's `start`
// is the first occurrence; the stored `rrule` string carries only
// FREQ/INTERVAL/BYDAY/UNTIL/COUNT (never DTSTART). `duration` (or end-start)
// gives each occurrence its length.
import { RRule, Weekday } from 'rrule';
import type { ClubEvent } from './types';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceOptions {
  freq: Frequency;
  interval: number;
  /** Weekday indexes, rrule convention: 0 = Monday … 6 = Sunday. */
  byweekday: number[];
  /** Epoch ms (inclusive last day), or null. Mutually exclusive with count. */
  until: number | null;
  count: number | null;
}

const FREQ_TO_RRULE: Record<Frequency, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
};

const RRULE_TO_FREQ: Record<number, Frequency> = {
  [RRule.DAILY]: 'daily',
  [RRule.WEEKLY]: 'weekly',
  [RRule.MONTHLY]: 'monthly',
};

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Build the storable RRULE string (no DTSTART). */
export function buildRRuleString(options: RecurrenceOptions): string {
  const rule = new RRule({
    freq: FREQ_TO_RRULE[options.freq],
    interval: options.interval > 1 ? options.interval : 1,
    byweekday: options.freq === 'weekly' && options.byweekday.length > 0
      ? options.byweekday.map((d) => new Weekday(d))
      : undefined,
    until: options.until ? new Date(options.until) : undefined,
    count: options.count ?? undefined,
  });
  // RRule.toString() emits "RRULE:FREQ=..."; we store just the value part.
  return rule.toString().replace(/^RRULE:/, '');
}

export function parseRRuleString(rrule: string | undefined): RecurrenceOptions | null {
  if (!rrule) return null;
  try {
    const parsed = RRule.parseString(rrule);
    const freq = parsed.freq !== undefined ? RRULE_TO_FREQ[parsed.freq] : undefined;
    if (!freq) return null;
    const byweekday = Array.isArray(parsed.byweekday)
      ? parsed.byweekday.map((d) => (typeof d === 'number' ? d : (d as Weekday).weekday))
      : parsed.byweekday !== undefined && parsed.byweekday !== null
        ? [typeof parsed.byweekday === 'number' ? parsed.byweekday : (parsed.byweekday as Weekday).weekday]
        : [];
    return {
      freq,
      interval: parsed.interval ?? 1,
      byweekday,
      until: parsed.until ? parsed.until.getTime() : null,
      count: parsed.count ?? null,
    };
  } catch {
    return null;
  }
}

/** Human-readable summary, e.g. "Weekly on Mon, Wed until Jun 5, 2027". */
export function describeRRule(rrule: string | undefined): string | null {
  const options = parseRRuleString(rrule);
  if (!options) return null;
  const every =
    options.interval > 1
      ? `Every ${options.interval} ${{ daily: 'days', weekly: 'weeks', monthly: 'months' }[options.freq]}`
      : { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[options.freq];
  const days =
    options.freq === 'weekly' && options.byweekday.length > 0
      ? ` on ${options.byweekday
          .slice()
          .sort((a, b) => a - b)
          .map((d) => WEEKDAY_LABELS[d])
          .join(', ')}`
      : '';
  const end = options.until
    ? ` until ${new Date(options.until).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    : options.count
      ? `, ${options.count} times`
      : '';
  return `${every}${days}${end}`;
}

export interface Occurrence {
  start: number;
  end: number;
}

/** Expand an event's occurrences that overlap [rangeStart, rangeEnd) (epoch ms). */
export function expandOccurrences(
  event: Pick<ClubEvent, 'start' | 'end' | 'rrule' | 'duration' | 'isRecurring'>,
  rangeStart: number,
  rangeEnd: number
): Occurrence[] {
  const duration = event.duration ?? Math.max(0, event.end - event.start);
  if (!event.isRecurring || !event.rrule) {
    return event.end > rangeStart && event.start < rangeEnd
      ? [{ start: event.start, end: event.end }]
      : [];
  }
  let rule: RRule;
  try {
    rule = new RRule({ ...RRule.parseString(event.rrule), dtstart: new Date(event.start) });
  } catch {
    return [{ start: event.start, end: event.start + duration }];
  }
  // Widen the window by the duration so in-progress occurrences are included.
  return rule
    .between(new Date(rangeStart - duration), new Date(rangeEnd), true)
    .map((date) => ({ start: date.getTime(), end: date.getTime() + duration }))
    .filter((occurrence) => occurrence.end > rangeStart && occurrence.start < rangeEnd);
}
