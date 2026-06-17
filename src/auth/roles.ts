// Student/faculty determination, mirroring the app's pattern
// (react/hooks/authContext.ts fetchPersonTypeAndDetails): exchange the
// Firebase ID token for a v3 client_credentials token at the school's PHP
// endpoint, then probe the v3 person endpoints for this person id. The matched
// person record is also the source of the user's first/last name — the OIDC ID
// token carries no reliable name claim, so the record must come from v3.
import type { PersonType } from '../data';

// Relative path: same-origin in production (site lives at
// nobilis.nobles.edu/clubs), proxied to nobilis.nobles.edu by vite in dev.
const API_TOKEN_URL = '/theappserver/api/api-token.php';
const V3_BASE_URL = 'https://api.veracross.com/nobles/v3/';

/** Subset of a v3 person record we persist on the public user record. */
export interface PersonDetails {
  first_name?: string | null;
  preferred_name?: string | null;
  last_name?: string | null;
}

export interface PersonProfile {
  /** Primary type (student takes precedence), or null if neither matched. */
  personType: PersonType | null;
  /** All matched roles in precedence order, e.g. ['student']. */
  roles: PersonType[];
  /** The first matched person record's detail fields (name, etc.). */
  details: PersonDetails | null;
}

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

/** Fetch a person from a v3 endpoint; returns its `data` object, or null. */
async function fetchPersonAt(
  endpoint: string,
  personId: string,
  v3Token: string
): Promise<PersonDetails | null> {
  try {
    const response = await fetch(`${V3_BASE_URL}${endpoint}/${parseInt(personId, 10)}`, {
      headers: {
        Authorization: `Bearer ${v3Token}`,
        Accept: 'application/json',
        'X-API-Revision': '',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return (data?.data as PersonDetails) ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve this person's type(s) and identity from Veracross v3. Probes the
 * student then staff_faculty endpoints (students take precedence, matching the
 * app's primary-role ordering) and returns the matched roles plus the first
 * matched detail record — the source of first/last name. Returns null when the
 * probe can't run at all (offline, token-endpoint failure), so callers can
 * leave any existing record untouched rather than overwrite it with blanks.
 */
export async function fetchPersonTypeAndDetails(
  firebaseIdToken: string,
  personId: string
): Promise<PersonProfile | null> {
  const v3Token = await getV3Token(firebaseIdToken);
  if (!v3Token) return null;

  const checks: { endpoint: string; role: PersonType }[] = [
    { endpoint: 'students', role: 'student' },
    { endpoint: 'staff_faculty', role: 'faculty' },
  ];
  const roles: PersonType[] = [];
  let details: PersonDetails | null = null;
  for (const c of checks) {
    const record = await fetchPersonAt(c.endpoint, personId, v3Token);
    if (record) {
      roles.push(c.role);
      if (!details) details = record;
    }
  }
  return { personType: roles[0] ?? null, roles, details };
}
