import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  fetchUnpublishedClubs,
  getClub,
  submitClub,
  withdrawRequest,
  type Club,
  type ClubWithId,
} from '../data';
import { ClubCard } from '../components/ClubCard';
import { ClubDetailModal } from '../components/ClubDetailModal';
import { ClubFormModal } from '../components/ClubFormModal';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import './MyClubsPage.css';

type DetailKind = 'led' | 'pending' | 'joined';
type EditKind = 'new' | 'led' | 'pending';

export function MyClubsPage() {
  const { loading, user, uid, signIn, myClubs } = useAuth();

  const [ledClubs, setLedClubs] = useState<ClubWithId[] | null>(null);
  const [pendingClubs, setPendingClubs] = useState<ClubWithId[]>([]);
  const [joinedClubs, setJoinedClubs] = useState<ClubWithId[]>([]);
  const [selected, setSelected] = useState<{ club: ClubWithId; kind: DetailKind } | null>(null);
  const [editing, setEditing] = useState<{ club: ClubWithId | null; kind: EditKind } | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const requested = useMemo(
    () => Object.entries(myClubs).filter(([, entry]) => entry.approval_status === 'requested'),
    [myClubs]
  );

  const load = useCallback(async () => {
    if (!uid) return;
    const ledIds = Object.entries(myClubs)
      .filter(
        ([, entry]) =>
          entry.role !== 'member' &&
          (entry.approval_status === 'approved' || entry.approval_status === 'active')
      )
      .map(([id]) => id);
    const joinedIds = Object.entries(myClubs)
      .filter(([, entry]) => entry.role === 'member' && entry.approval_status === 'approved')
      .map(([id]) => id);
    try {
      const [led, joined, unpublished] = await Promise.all([
        Promise.all(ledIds.map(getClub)),
        Promise.all(joinedIds.map(getClub)),
        // Pending submissions aren't linked on the user record (submitClub
        // only writes /clubs/unpublished), so scan unpublished for our uid —
        // the same approach the old site used.
        fetchUnpublishedClubs().catch(() => [] as ClubWithId[]),
      ]);
      setLedClubs(led.filter((club): club is ClubWithId => club !== null));
      setJoinedClubs(joined.filter((club): club is ClubWithId => club !== null));
      setPendingClubs(unpublished.filter((club) => Boolean(club.leader?.[uid] || club.advisor?.[uid])));
    } catch (error) {
      console.error('Failed to load my clubs:', error);
      setLedClubs([]);
      setJoinedClubs([]);
      setPendingClubs([]);
    }
  }, [uid, myClubs]);

  useEffect(() => {
    void load();
  }, [load]);

  // Confirmation banners fade away on their own.
  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  const handleSubmit = async (clubId: string, club: Club) => {
    await submitClub(clubId, club);
    const kind = editing?.kind;
    setEditing(null);
    setConfirmation(
      kind === 'pending' ? 'Submission updated — awaiting admin approval.' : 'Submitted for admin approval.'
    );
    void load();
  };

  const handleWithdraw = async (clubId: string) => {
    if (!uid) return;
    try {
      await withdrawRequest(uid, clubId);
    } catch {
      window.alert('Could not withdraw the request — please try again.');
    }
  };

  if (loading) {
    return (
      <div className="myclubs-page">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="myclubs-page">
        <EmptyState icon="🔑" message="Sign in to see and manage your clubs." />
        <div className="myclubs-signin">
          <button className="btn-primary" onClick={() => void signIn()}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const nothingToShow =
    ledClubs !== null &&
    ledClubs.length === 0 &&
    pendingClubs.length === 0 &&
    joinedClubs.length === 0 &&
    requested.length === 0;

  return (
    <div className="myclubs-page">
      <div className="myclubs-header">
        <h1 className="myclubs-title">My Clubs</h1>
        <button className="btn-primary" onClick={() => setEditing({ club: null, kind: 'new' })}>
          Register a new club
        </button>
      </div>

      {confirmation && <div className="myclubs-confirmation fade-in-row">{confirmation}</div>}

      {ledClubs === null ? (
        <Spinner label="Loading your clubs…" />
      ) : (
        <>
          {ledClubs.length > 0 && (
            <section className="myclubs-section">
              <h2 className="section-header">Clubs you lead or advise</h2>
              <div className="myclubs-grid">
                {ledClubs.map((club, index) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    index={index}
                    onClick={() => setSelected({ club, kind: 'led' })}
                  />
                ))}
              </div>
            </section>
          )}

          {pendingClubs.length > 0 && (
            <section className="myclubs-section">
              <h2 className="section-header">Pending submissions</h2>
              <div className="myclubs-grid">
                {pendingClubs.map((club, index) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    index={index}
                    onClick={() => setSelected({ club, kind: 'pending' })}
                  />
                ))}
              </div>
            </section>
          )}

          {joinedClubs.length > 0 && (
            <section className="myclubs-section">
              <h2 className="section-header">Clubs you've joined</h2>
              <div className="myclubs-grid">
                {joinedClubs.map((club, index) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    index={index}
                    onClick={() => setSelected({ club, kind: 'joined' })}
                  />
                ))}
              </div>
            </section>
          )}

          {requested.length > 0 && (
            <section className="myclubs-section">
              <h2 className="section-header">Pending join requests</h2>
              <ul className="myclubs-requests">
                {requested.map(([clubId, entry]) => (
                  <li key={clubId} className="myclubs-request card-soft">
                    <span className="myclubs-request-name">{entry.name}</span>
                    <button className="btn-outline" onClick={() => void handleWithdraw(clubId)}>
                      Withdraw
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {nothingToShow && (
            <EmptyState
              icon="🎈"
              message="You're not part of any clubs yet — browse the directory to join one, or register your own."
            />
          )}
        </>
      )}

      {selected && (
        <ClubDetailModal
          club={selected.club}
          onClose={() => setSelected(null)}
          actions={
            selected.kind === 'joined' ? undefined : (
              <button
                className="btn-outline"
                onClick={() => {
                  setEditing({ club: selected.club, kind: selected.kind === 'pending' ? 'pending' : 'led' });
                  setSelected(null);
                }}
              >
                {selected.kind === 'pending' ? 'Edit submission' : 'Edit listing'}
              </button>
            )
          }
        />
      )}

      {editing && (
        <ClubFormModal
          open
          onClose={() => setEditing(null)}
          club={editing.club}
          title={
            editing.kind === 'new'
              ? 'Register a new club'
              : editing.kind === 'pending'
                ? 'Edit submission'
                : 'Edit listing'
          }
          submitLabel={editing.kind === 'new' ? 'Submit for approval' : 'Submit edits for approval'}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
