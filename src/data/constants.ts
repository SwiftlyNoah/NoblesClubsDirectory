export const SUBJECTS = [
  'Activism',
  'Business',
  'Computer Science',
  'Foreign Language',
  'Games/Special Interests',
  'Group Support',
  'Literature',
  'Math',
  'Performing Arts',
  'Physical Science',
  'Visual Arts',
  'Community Service',
  'Social Science',
  'Sports',
] as const;

export type Subject = (typeof SUBJECTS)[number];

/**
 * Accent color per subject, used for card stripes and badges on both the
 * website and the app (10%-opacity tint behind the solid accent, per the
 * design guide).
 */
export const SUBJECT_COLORS: Record<string, string> = {
  Activism: '#E06666',
  Business: '#5B9BD5',
  'Computer Science': '#9B7EDE',
  'Foreign Language': '#E6A23C',
  'Games/Special Interests': '#4DB6AC',
  'Group Support': '#F06292',
  Literature: '#8D6E63',
  Math: '#5C6BC0',
  'Performing Arts': '#AB47BC',
  'Physical Science': '#29B6F6',
  'Visual Arts': '#FF7043',
  'Community Service': '#66BB6A',
  'Social Science': '#78909C',
  Sports: '#EF5350',
};

export const FALLBACK_ACCENT = '#5B9BD5';

export function subjectColor(subject: string | undefined): string {
  return (subject && SUBJECT_COLORS[subject]) || FALLBACK_ACCENT;
}
