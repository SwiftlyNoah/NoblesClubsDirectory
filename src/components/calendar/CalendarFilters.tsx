import type { ClubWithId } from '../../data';

/**
 * The calendar's single active filter. Exactly one is in effect at a time:
 * everything ('all'), one club, or the viewer's own clubs.
 */
export type CalendarFilter =
  | { kind: 'all' }
  | { kind: 'club'; clubId: string }
  | { kind: 'myClubs' };

interface CalendarFiltersProps {
  /** Active clubs, used to populate the club dropdown. */
  clubs: ClubWithId[];
  filter: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
  /** Show the "My clubs" chip (signed-in users only). */
  showMyClubsToggle: boolean;
}

/** Controlled, mutually-exclusive filter row for the events calendar. */
export function CalendarFilters({
  clubs,
  filter,
  onChange,
  showMyClubsToggle,
}: CalendarFiltersProps) {
  return (
    <div className="calendar-filters">
      <div className="calendar-filters-row">
        <button
          className={`chip${filter.kind === 'all' ? ' selected' : ''}`}
          onClick={() => onChange({ kind: 'all' })}
        >
          All clubs
        </button>
        {showMyClubsToggle && (
          <button
            className={`chip${filter.kind === 'myClubs' ? ' selected' : ''}`}
            onClick={() =>
              onChange(filter.kind === 'myClubs' ? { kind: 'all' } : { kind: 'myClubs' })
            }
          >
            My clubs
          </button>
        )}
        <select
          className={`select-field calendar-club-select${
            filter.kind === 'club' ? ' selected' : ''
          }`}
          aria-label="Filter by club"
          value={filter.kind === 'club' ? filter.clubId : ''}
          onChange={(event) =>
            onChange(
              event.target.value
                ? { kind: 'club', clubId: event.target.value }
                : { kind: 'all' }
            )
          }
        >
          <option value="">Select a club</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
