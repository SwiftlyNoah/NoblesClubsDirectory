import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  isClubManager,
  joinClub,
  leaveClub,
  requestToJoin,
  withdrawRequest,
  type ClubWithId,
} from '../data';

interface JoinButtonProps {
  club: ClubWithId;
  /** Called after any successful membership change. */
  onChange?: () => void;
}

export function JoinButton({ club, onChange }: JoinButtonProps) {
  const { user, uid, firstName, email, myClubs, signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!club.is_active) return null;

  if (!user || !uid) {
    return (
      <button className="btn-primary" onClick={() => void signIn()}>
        Sign in to join
      </button>
    );
  }

  // Leaders/advisors don't join their own club.
  if (isClubManager(club, uid)) return null;

  const entry = myClubs[club.id];
  const policy = club.join_policy ?? 'open';

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChange?.();
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const profile = { name: firstName ?? '', email: email ?? '' };

  let button;
  if (entry?.approval_status === 'requested') {
    button = (
      <button className="btn-outline" disabled={busy} onClick={() => run(() => withdrawRequest(uid, club.id))}>
        Requested — withdraw
      </button>
    );
  } else if (entry && entry.role === 'member') {
    button = (
      <button className="btn-destructive" disabled={busy} onClick={() => run(() => leaveClub(uid, club.id))}>
        Leave club
      </button>
    );
  } else if (entry) {
    // Leader/advisor relationship recorded on the user but not (yet) on the
    // club record (e.g. pending club edits) — no join action.
    return null;
  } else if (policy === 'approval') {
    button = (
      <button className="btn-primary" disabled={busy} onClick={() => run(() => requestToJoin(uid, profile, club.id, club))}>
        Request to join
      </button>
    );
  } else {
    button = (
      <button className="btn-primary" disabled={busy} onClick={() => run(() => joinClub(uid, profile, club.id, club))}>
        Join club
      </button>
    );
  }

  return (
    <div>
      {button}
      {error && <p style={{ color: 'var(--negative)', fontSize: 14, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
