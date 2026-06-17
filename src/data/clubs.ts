import { equalTo, get, getDatabase, orderByChild, query, ref, update } from './firebase';
import { PATHS } from './paths';
import type { Club, ClubWithId, UserClubEntry } from './types';
import { stripUndefined } from './util';

function db() {
  return getDatabase();
}

function sortByName(clubs: Record<string, Club>): ClubWithId[] {
  return Object.entries(clubs)
    .map(([id, club]) => ({ ...club, id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Active clubs for everyone; admins see inactive clubs too. */
export async function fetchClubDirectory(includeInactive = false): Promise<ClubWithId[]> {
  const dataRef = ref(db(), PATHS.directory);
  const clubsQuery = includeInactive
    ? dataRef
    : query(dataRef, orderByChild('is_active'), equalTo(true));
  const snapshot = await get(clubsQuery);
  return sortByName((snapshot.val() as Record<string, Club>) ?? {});
}

export async function getClub(clubId: string): Promise<ClubWithId | null> {
  const snapshot = await get(ref(db(), PATHS.club(clubId)));
  return snapshot.exists() ? { ...(snapshot.val() as Club), id: clubId } : null;
}

export async function fetchUnpublishedClubs(): Promise<ClubWithId[]> {
  const snapshot = await get(ref(db(), PATHS.unpublished));
  return sortByName((snapshot.val() as Record<string, Club>) ?? {});
}

export async function userIsAdmin(uid: string): Promise<boolean> {
  try {
    const snapshot = await get(ref(db(), PATHS.admin(uid)));
    return snapshot.exists();
  } catch {
    // Non-admins are denied read on /clubs/admins/{uid} by the rules; a
    // permission error therefore just means "not an admin".
    return false;
  }
}

function userClubEntry(club: Club, role?: string): UserClubEntry {
  return stripUndefined({
    name: club.name,
    image: club.image,
    subject: club.subject,
    approval_status: 'approved',
    role,
  });
}

/** Fan-out helpers: one entry per leader/advisor uid on the club record. */
function leaderUids(club: Club): [string, string | undefined][] {
  return Object.entries(club.leader ?? {}).map(([uid, leader]) => [uid, leader.role]);
}

function advisorUids(club: Club): string[] {
  return Object.keys(club.advisor ?? {});
}

/** Submit a new or edited club for admin approval. */
export async function submitClub(clubId: string, club: Club): Promise<void> {
  const updates: Record<string, unknown> = {
    [PATHS.unpublishedClub(clubId)]: stripUndefined(club),
  };
  await update(ref(db()), updates);
}

/** Admin: move an unpublished club into the directory and link its people. */
export async function approveClub(clubId: string, club: Club): Promise<void> {
  const updates: Record<string, unknown> = {
    [PATHS.unpublishedClub(clubId)]: null,
    [PATHS.club(clubId)]: stripUndefined(club),
  };
  for (const [uid, role] of leaderUids(club)) {
    updates[PATHS.userClub(uid, clubId)] = userClubEntry(club, role);
  }
  for (const uid of advisorUids(club)) {
    updates[PATHS.userClub(uid, clubId)] = userClubEntry(club);
  }
  await update(ref(db()), updates);
}

/** Admin: reject a pending submission and unlink its people. */
export async function rejectClub(clubId: string, club: Club): Promise<void> {
  const updates: Record<string, unknown> = {
    [PATHS.unpublishedClub(clubId)]: null,
  };
  // Only clear user links if the club isn't also published (an edit rejection
  // must not strip leaders of the live club).
  const published = await get(ref(db(), PATHS.club(clubId)));
  if (!published.exists()) {
    for (const [uid] of leaderUids(club)) updates[PATHS.userClub(uid, clubId)] = null;
    for (const uid of advisorUids(club)) updates[PATHS.userClub(uid, clubId)] = null;
  }
  await update(ref(db()), updates);
}

/** Admin: delete a club everywhere — directory, pending copy, people links, members, requests, events. */
export async function deleteClub(clubId: string, club: Club): Promise<void> {
  const updates: Record<string, unknown> = {
    [PATHS.unpublishedClub(clubId)]: null,
    [PATHS.club(clubId)]: null,
  };
  for (const [uid] of leaderUids(club)) updates[PATHS.userClub(uid, clubId)] = null;
  for (const uid of advisorUids(club)) updates[PATHS.userClub(uid, clubId)] = null;

  const [membersSnap, requestsSnap, eventsSnap] = await Promise.all([
    get(ref(db(), PATHS.clubMembers(clubId))),
    get(ref(db(), PATHS.clubJoinRequests(clubId))),
    get(query(ref(db(), PATHS.events), orderByChild('clubId'), equalTo(clubId))),
  ]);
  // The rules only grant write on members/join_requests at the per-uid leaf
  // (an admin has no write rule on the clubId-level node), so delete each
  // entry individually rather than nulling the whole subtree — RTDB removes
  // the now-empty parent node automatically.
  for (const uid of Object.keys(membersSnap.val() ?? {})) {
    updates[PATHS.clubMember(clubId, uid)] = null;
    updates[PATHS.userClub(uid, clubId)] = null;
  }
  for (const uid of Object.keys(requestsSnap.val() ?? {})) {
    updates[PATHS.clubJoinRequest(clubId, uid)] = null;
    updates[PATHS.userClub(uid, clubId)] = null;
  }
  for (const eventId of Object.keys(eventsSnap.val() ?? {})) {
    updates[PATHS.event(eventId)] = null;
  }
  await update(ref(db()), updates);
}

/** Admin: reactivate a club and restore leader/advisor links. */
export async function setClubActive(clubId: string, club: Club): Promise<void> {
  const updates: Record<string, unknown> = {
    [`${PATHS.club(clubId)}/is_active`]: true,
  };
  for (const [uid, role] of leaderUids(club)) {
    updates[PATHS.userClub(uid, clubId)] = userClubEntry(club, role);
  }
  for (const uid of advisorUids(club)) {
    updates[PATHS.userClub(uid, clubId)] = userClubEntry(club);
  }
  await update(ref(db()), updates);
}

/** Admin: deactivate a club and remove it from leader/advisor lists. */
export async function setClubInactive(clubId: string, club: Club): Promise<void> {
  const updates: Record<string, unknown> = {
    [`${PATHS.club(clubId)}/is_active`]: false,
  };
  for (const [uid] of leaderUids(club)) updates[PATHS.userClub(uid, clubId)] = null;
  for (const uid of advisorUids(club)) updates[PATHS.userClub(uid, clubId)] = null;
  await update(ref(db()), updates);
}

/** Admin: write a club straight into the directory (edit-approval path). */
export async function adminWriteClub(clubId: string, club: Club): Promise<void> {
  const updates: Record<string, unknown> = {
    [PATHS.club(clubId)]: stripUndefined(club),
  };
  for (const [uid, role] of leaderUids(club)) {
    updates[PATHS.userClub(uid, clubId)] = userClubEntry(club, role);
  }
  for (const uid of advisorUids(club)) {
    updates[PATHS.userClub(uid, clubId)] = userClubEntry(club);
  }
  await update(ref(db()), updates);
}

/** Can this uid edit the club and manage its events? */
export function isClubManager(club: Club, uid: string | null): boolean {
  if (!uid) return false;
  return Boolean(club.leader?.[uid] || club.advisor?.[uid]);
}
