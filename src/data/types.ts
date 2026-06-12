export type JoinPolicy = 'open' | 'approval';

/**
 * Status of a user's relationship to a club, as stored in the denormalized
 * /users/public/{uid}/clubs/{clubId} map.
 * - "approved": full member / leader of a published club
 * - "active": legacy value written when an admin reactivates a club
 * - "requested": pending join request (approval-policy clubs)
 * - "pending": club submission awaiting admin approval
 */
export type ApprovalStatus = 'approved' | 'active' | 'requested' | 'pending';

export type PersonType = 'student' | 'faculty';

export interface ClubLeader {
  name: string;
  email: string;
  role?: string;
}

export interface ClubAdvisor {
  name: string;
  email: string;
}

export interface Club {
  name: string;
  description: string;
  subject: string;
  /** Filename in Firebase Storage under /clubs/ (legacy field, kept for the iOS viewer). */
  image?: string;
  /** Full public download URL; written on upload so clients don't need the Storage SDK. */
  image_url?: string;
  meeting_room?: string;
  /** Free-text signup instructions (legacy; superseded by join_policy + membership). */
  sign_up?: string;
  is_active: boolean;
  /** Missing on pre-membership clubs — treat as "open". */
  join_policy?: JoinPolicy;
  leader?: Record<string, ClubLeader>;
  advisor?: Record<string, ClubAdvisor>;
}

export type ClubWithId = Club & { id: string };

export interface MemberEntry {
  name: string;
  email: string;
  joinedAt: number;
}

export interface JoinRequest {
  name: string;
  email: string;
  message?: string;
  requestedAt: number;
}

export interface UserClubEntry {
  name: string;
  image?: string;
  subject: string;
  approval_status: ApprovalStatus;
  /** Leader role string (e.g. "President"), or "member" for joined members. */
  role?: string;
}

export interface UserPublic {
  first: string;
  email: string;
  uid: string;
  /** Veracross person id from the OIDC claim — keys the fall account migration. */
  veracross_person_id?: string;
  person_type?: PersonType;
  clubs?: Record<string, UserClubEntry>;
}

export interface ClubEvent {
  title: string;
  clubId: string;
  clubName: string;
  clubSubject: string;
  /** Epoch ms of the (first) occurrence start. */
  start: number;
  /** Epoch ms of the (first) occurrence end. */
  end: number;
  allDay?: boolean;
  location?: string;
  description?: string;
  externalLink?: string;
  isRecurring?: boolean;
  /** RFC 5545 recurrence (FREQ/INTERVAL/BYDAY/UNTIL/COUNT only — start lives in `start`). */
  rrule?: string;
  /** Occurrence length in ms for recurring events. */
  duration?: number;
  /** e.g. "2026-2027" — enables archiving old years. */
  school_year?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export type ClubEventWithId = ClubEvent & { id: string };
