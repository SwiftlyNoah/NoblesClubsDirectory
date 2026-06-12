import { get, getDatabase, ref, update } from './firebase';
import { PATHS } from './paths';
import type { Club, JoinRequest, MemberEntry, UserClubEntry } from './types';
import { stripUndefined } from './util';

function db() {
  return getDatabase();
}

export interface MemberProfile {
  name: string;
  email: string;
}

function memberUserClubEntry(club: Club, status: 'approved' | 'requested'): UserClubEntry {
  return stripUndefined({
    name: club.name,
    image: club.image,
    subject: club.subject,
    approval_status: status,
    role: 'member',
  });
}

/** Instant join (open clubs). Atomic: member entry + the user's own club map. */
export async function joinClub(
  uid: string,
  profile: MemberProfile,
  clubId: string,
  club: Club
): Promise<void> {
  const entry: MemberEntry = { ...profile, joinedAt: Date.now() };
  await update(ref(db()), {
    [PATHS.clubMember(clubId, uid)]: entry,
    [PATHS.userClub(uid, clubId)]: memberUserClubEntry(club, 'approved'),
  });
}

/** Request membership in an approval-policy club. */
export async function requestToJoin(
  uid: string,
  profile: MemberProfile,
  clubId: string,
  club: Club,
  message?: string
): Promise<void> {
  const request: JoinRequest = stripUndefined({ ...profile, message, requestedAt: Date.now() });
  await update(ref(db()), {
    [PATHS.clubJoinRequest(clubId, uid)]: request,
    [PATHS.userClub(uid, clubId)]: memberUserClubEntry(club, 'requested'),
  });
}

/** Withdraw one's own pending request. */
export async function withdrawRequest(uid: string, clubId: string): Promise<void> {
  await update(ref(db()), {
    [PATHS.clubJoinRequest(clubId, uid)]: null,
    [PATHS.userClub(uid, clubId)]: null,
  });
}

/** Leader/advisor: approve a pending request. */
export async function approveRequest(
  clubId: string,
  club: Club,
  requesterUid: string,
  request: JoinRequest
): Promise<void> {
  const entry: MemberEntry = {
    name: request.name,
    email: request.email,
    joinedAt: Date.now(),
  };
  await update(ref(db()), {
    [PATHS.clubJoinRequest(clubId, requesterUid)]: null,
    [PATHS.clubMember(clubId, requesterUid)]: entry,
    [PATHS.userClub(requesterUid, clubId)]: memberUserClubEntry(club, 'approved'),
  });
}

/** Leader/advisor: deny a pending request. */
export async function denyRequest(clubId: string, requesterUid: string): Promise<void> {
  await update(ref(db()), {
    [PATHS.clubJoinRequest(clubId, requesterUid)]: null,
    [PATHS.userClub(requesterUid, clubId)]: null,
  });
}

/** Member leaves a club (or leader/advisor removes them — same shape). */
export async function leaveClub(uid: string, clubId: string): Promise<void> {
  await update(ref(db()), {
    [PATHS.clubMember(clubId, uid)]: null,
    [PATHS.userClub(uid, clubId)]: null,
  });
}

export const removeMember = leaveClub;

export async function listMembers(clubId: string): Promise<Record<string, MemberEntry>> {
  const snapshot = await get(ref(db(), PATHS.clubMembers(clubId)));
  return (snapshot.val() as Record<string, MemberEntry>) ?? {};
}

export async function listJoinRequests(clubId: string): Promise<Record<string, JoinRequest>> {
  const snapshot = await get(ref(db(), PATHS.clubJoinRequests(clubId)));
  return (snapshot.val() as Record<string, JoinRequest>) ?? {};
}

/** All member counts in one read (signed-in users only, per rules). */
export async function fetchMemberCounts(): Promise<Record<string, number>> {
  const snapshot = await get(ref(db(), PATHS.members));
  const all = (snapshot.val() as Record<string, Record<string, MemberEntry>>) ?? {};
  return Object.fromEntries(Object.entries(all).map(([clubId, m]) => [clubId, Object.keys(m).length]));
}
