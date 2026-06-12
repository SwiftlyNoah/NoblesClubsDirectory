import { equalTo, get, getDatabase, orderByChild, query, ref, set, update } from './firebase';
import { PATHS } from './paths';
import type { ClubEvent, ClubEventWithId } from './types';
import { randomID, schoolYearFor, stripUndefined } from './util';

function db() {
  return getDatabase();
}

function withIds(events: Record<string, ClubEvent> | null): ClubEventWithId[] {
  return Object.entries(events ?? {}).map(([id, event]) => ({ ...event, id }));
}

export async function fetchAllEvents(): Promise<ClubEventWithId[]> {
  const snapshot = await get(ref(db(), PATHS.events));
  return withIds(snapshot.val() as Record<string, ClubEvent> | null);
}

export async function fetchEventsForClub(clubId: string): Promise<ClubEventWithId[]> {
  const snapshot = await get(
    query(ref(db(), PATHS.events), orderByChild('clubId'), equalTo(clubId))
  );
  return withIds(snapshot.val() as Record<string, ClubEvent> | null);
}

/** "Events for my clubs": one indexed query per club id (users have few clubs). */
export async function fetchEventsForClubs(clubIds: string[]): Promise<ClubEventWithId[]> {
  const results = await Promise.all(clubIds.map(fetchEventsForClub));
  return results.flat();
}

export async function getEvent(eventId: string): Promise<ClubEventWithId | null> {
  const snapshot = await get(ref(db(), PATHS.event(eventId)));
  return snapshot.exists() ? { ...(snapshot.val() as ClubEvent), id: eventId } : null;
}

export type NewEvent = Omit<ClubEvent, 'createdBy' | 'createdAt' | 'updatedAt' | 'school_year'>;

export async function createEvent(eventData: NewEvent, uid: string): Promise<string> {
  const eventId = randomID();
  const event: ClubEvent = stripUndefined({
    ...eventData,
    school_year: schoolYearFor(new Date(eventData.start)),
    createdBy: uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await set(ref(db(), PATHS.event(eventId)), event);
  return eventId;
}

export async function updateEvent(
  eventId: string,
  eventData: Omit<ClubEvent, 'updatedAt'>
): Promise<void> {
  const event: ClubEvent = stripUndefined({
    ...eventData,
    school_year: schoolYearFor(new Date(eventData.start)),
    updatedAt: Date.now(),
  });
  await set(ref(db(), PATHS.event(eventId)), event);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await update(ref(db()), { [PATHS.event(eventId)]: null });
}
