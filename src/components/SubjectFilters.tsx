import { SUBJECTS } from '../data';
import './SubjectFilters.css';

interface SubjectFiltersProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Wrapping row of filter chips (the web translation of AnimatedChip). */
export function SubjectFilters({ selected, onChange }: SubjectFiltersProps) {
  const allSelected = selected.length === SUBJECTS.length;

  const toggle = (subject: string) => {
    onChange(
      selected.includes(subject)
        ? selected.filter((s) => s !== subject)
        : [...selected, subject]
    );
  };

  return (
    <div className="subject-filters">
      <button
        className={`chip${allSelected ? ' selected' : ''}`}
        onClick={() => onChange(allSelected ? [] : [...SUBJECTS])}
      >
        All
      </button>
      {SUBJECTS.map((subject) => (
        <button
          key={subject}
          className={`chip${selected.includes(subject) ? ' selected' : ''}`}
          onClick={() => toggle(subject)}
        >
          {subject}
        </button>
      ))}
    </div>
  );
}
