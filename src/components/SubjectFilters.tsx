import { SUBJECTS } from '../data';
import './SubjectFilters.css';

interface SubjectFiltersProps {
  /** The selected subject, or null when no subject filter is active. */
  selected: string | null;
  onChange: (selected: string | null) => void;
}

/**
 * Single-select row of subject chips. Selecting a chip shows only clubs of
 * that subject; clicking the active chip again clears it (null = no filter).
 * The "All" chip lives in the parent so it can reset sibling filters too.
 */
export function SubjectFilters({ selected, onChange }: SubjectFiltersProps) {
  return (
    <>
      {SUBJECTS.map((subject) => (
        <button
          key={subject}
          className={`chip${selected === subject ? ' selected' : ''}`}
          onClick={() => onChange(selected === subject ? null : subject)}
        >
          {subject}
        </button>
      ))}
    </>
  );
}
