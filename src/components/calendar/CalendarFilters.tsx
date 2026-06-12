import { SubjectFilters } from '../SubjectFilters';
import type { ClubWithId } from '../../data';

interface CalendarFiltersProps {
  /** Active clubs, used to populate the club dropdown. */
  clubs: ClubWithId[];
  /** Selected club id, or '' for "All clubs". */
  selectedClubId: string;
  onClubChange: (clubId: string) => void;
  selectedSubjects: string[];
  onSubjectsChange: (subjects: string[]) => void;
  /** Show the "My clubs" toggle (signed-in users only). */
  showMyClubsToggle: boolean;
  myClubsOnly: boolean;
  onMyClubsOnlyChange: (value: boolean) => void;
}

/** Controlled filter row for the events calendar: club, subjects, my-clubs. */
export function CalendarFilters({
  clubs,
  selectedClubId,
  onClubChange,
  selectedSubjects,
  onSubjectsChange,
  showMyClubsToggle,
  myClubsOnly,
  onMyClubsOnlyChange,
}: CalendarFiltersProps) {
  return (
    <div className="calendar-filters">
      <div className="calendar-filters-row">
        <select
          className="select-field calendar-club-select"
          aria-label="Filter by club"
          value={selectedClubId}
          onChange={(event) => onClubChange(event.target.value)}
        >
          <option value="">All clubs</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
        {showMyClubsToggle && (
          <button
            className={`chip${myClubsOnly ? ' selected' : ''}`}
            onClick={() => onMyClubsOnlyChange(!myClubsOnly)}
          >
            My clubs
          </button>
        )}
      </div>
      <SubjectFilters selected={selectedSubjects} onChange={onSubjectsChange} />
    </div>
  );
}
