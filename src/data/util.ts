const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function randomID(): string {
  return Array.from({ length: 20 }, () =>
    ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length))
  ).join('');
}

/** RTDB rejects undefined values — drop them (recursively) before writing. */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    ) as T;
  }
  return value;
}

/** "First Last" from a user record, collapsing to whatever part is present. */
export function fullName(u: { first?: string; last?: string } | null | undefined): string {
  if (!u) return '';
  return [u.first, u.last].filter(Boolean).join(' ').trim();
}

/** School years run July 1 – June 30: June 2027 is still "2026-2027". */
export function schoolYearFor(date: Date): string {
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

const STORAGE_BUCKET = 'nobles-20183.appspot.com';

/**
 * Public download URL for a club image, derived from the legacy `image`
 * filename. Works without the Storage SDK because /clubs/* is public-read in
 * storage.rules. Prefer a club's stored `image_url` when present.
 */
export function clubImageUrl(image: string | undefined): string | null {
  if (!image) return null;
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(
    `clubs/${image}`
  )}?alt=media`;
}

export function clubImageSrc(club: { image?: string; image_url?: string }): string | null {
  return club.image_url ?? clubImageUrl(club.image);
}
