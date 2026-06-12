// Student/faculty determination, mirroring the app's pattern
// (react/hooks/authContext.ts fetchPersonTypeAndDetails): exchange the
// Firebase ID token for a v3 client_credentials token at the school's PHP
// endpoint, then probe the v3 person endpoints for this person id.
import type { PersonType } from '../data';

// Relative path: same-origin in production (site lives at
// nobilis.nobles.edu/clubs), proxied to nobilis.nobles.edu by vite in dev.
const API_TOKEN_URL = '/theappserver/api/api-token.php';
const V3_BASE_URL = 'https://api.veracross.com/nobles/v3/';

async function getV3Token(firebaseIdToken: string): Promise<string | null> {
  try {
    const response = await fetch(API_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firebaseIdToken}`,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function personExistsAt(endpoint: string, personId: string, v3Token: string): Promise<boolean> {
  try {
    const response = await fetch(`${V3_BASE_URL}${endpoint}/${parseInt(personId, 10)}`, {
      headers: {
        Authorization: `Bearer ${v3Token}`,
        Accept: 'application/json',
        'X-API-Revision': '',
      },
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data?.data);
  } catch {
    return false;
  }
}

/**
 * Probe Veracross for whether this person is a student or faculty member.
 * Students take precedence (a person in both is treated as a student, matching
 * the app's primary-role ordering). Returns null when the probe can't run
 * (offline, endpoint failure) — callers should leave any cached value alone.
 */
export async function probePersonType(
  firebaseIdToken: string,
  personId: string
): Promise<PersonType | null> {
  const v3Token = await getV3Token(firebaseIdToken);
  if (!v3Token) return null;
  if (await personExistsAt('students', personId, v3Token)) return 'student';
  if (await personExistsAt('staff_faculty', personId, v3Token)) return 'faculty';
  return null;
}
