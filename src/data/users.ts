import { equalTo, get, getDatabase, orderByChild, query, ref, update } from './firebase';
import { PATHS } from './paths';
import type { PersonType, UserClubEntry, UserPublic } from './types';
import { stripUndefined } from './util';

function db() {
  return getDatabase();
}

export interface UserProfileInput {
  email: string;
  first: string;
  last?: string;
  /** Veracross person id. */
  id?: string;
  /** Comma-joined role list, e.g. "student" or "faculty, parent". */
  roles?: string;
}

/**
 * Create or refresh the signed-in user's public record. Merges fields (a
 * `update` never touches the clubs map, and stripUndefined leaves unknown
 * fields untouched). Storing the Veracross `id` here is what makes the planned
 * fall UID migration a simple re-key.
 */
export async function ensureUserRecord(uid: string, profile: UserProfileInput): Promise<void> {
  await update(
    ref(db(), PATHS.user(uid)),
    stripUndefined({
      email: profile.email,
      first: profile.first,
      last: profile.last,
      uid,
      id: profile.id,
      roles: profile.roles,
    })
  );
}

export async function setUserRoles(uid: string, roles: string): Promise<void> {
  await update(ref(db(), PATHS.user(uid)), { roles });
}

/** Primary person type from a stored roles string (student takes precedence). */
export function personTypeFromRoles(roles: string | undefined): PersonType | null {
  const list = (roles ?? '').split(',').map((r) => r.trim().toLowerCase());
  if (list.includes('student')) return 'student';
  if (list.includes('faculty')) return 'faculty';
  return null;
}

export async function getUser(uid: string): Promise<UserPublic | null> {
  const snapshot = await get(ref(db(), PATHS.user(uid)));
  return snapshot.exists() ? { ...(snapshot.val() as UserPublic), uid } : null;
}

/** Look up a user by their school email (leader/advisor pickers). */
export async function findUserWithEmail(email: string): Promise<UserPublic | null> {
  const snapshot = await get(
    query(ref(db(), PATHS.usersPublic), orderByChild('email'), equalTo(email))
  );
  if (!snapshot.exists()) return null;
  const users = snapshot.val() as Record<string, UserPublic>;
  const uid = Object.keys(users)[0];
  return { ...users[uid], uid };
}

export async function fetchMyClubs(uid: string): Promise<Record<string, UserClubEntry>> {
  const snapshot = await get(ref(db(), PATHS.userClubs(uid)));
  return (snapshot.val() as Record<string, UserClubEntry>) ?? {};
}
