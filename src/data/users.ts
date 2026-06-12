import { equalTo, get, getDatabase, orderByChild, query, ref, update } from './firebase';
import { PATHS } from './paths';
import type { PersonType, UserClubEntry, UserPublic } from './types';
import { stripUndefined } from './util';

function db() {
  return getDatabase();
}

export interface UserProfileInput {
  first: string;
  email: string;
  veracrossPersonId?: string;
}

/**
 * Create or refresh the signed-in user's public record. Merges fields (never
 * touches the clubs map). Storing veracross_person_id here is what makes the
 * planned fall UID migration a simple re-key.
 */
export async function ensureUserRecord(uid: string, profile: UserProfileInput): Promise<void> {
  await update(
    ref(db(), PATHS.user(uid)),
    stripUndefined({
      first: profile.first,
      email: profile.email,
      uid,
      veracross_person_id: profile.veracrossPersonId,
    })
  );
}

export async function setPersonType(uid: string, personType: PersonType): Promise<void> {
  await update(ref(db(), PATHS.user(uid)), { person_type: personType });
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
