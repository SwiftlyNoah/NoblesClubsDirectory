import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  adminWriteClub,
  approveClub,
  deleteClub,
  fetchClubDirectory,
  fetchUnpublishedClubs,
  rejectClub,
  setClubActive,
  setClubInactive,
  type ClubWithId,
} from '../data';
import { ClubCard } from '../components/ClubCard';
import { ClubDetailModal } from '../components/ClubDetailModal';
import { ClubFormModal } from '../components/ClubFormModal';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import './AdminPage.css';

type DetailKind = 'new' | 'edited' | 'published';

export function AdminPage() {
  const { loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [directory, setDirectory] = useState<ClubWithId[] | null>(null);
  const [unpublished, setUnpublished] = useState<ClubWithId[]>([]);
  const [selected, setSelected] = useState<{ club: ClubWithId; kind: DetailKind } | null>(null);
  const [editingClub, setEditingClub] = useState<ClubWithId | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [loading, isAdmin, navigate]);

  const load = useCallback(async () => {
    try {
      const [unpublishedClubs, directoryClubs] = await Promise.all([
        fetchUnpublishedClubs(),
        fetchClubDirectory(true),
      ]);
      setUnpublished(unpublishedClubs);
      setDirectory(directoryClubs);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      window.alert('Failed to load clubs — please try again.');
      setDirectory([]);
      setUnpublished([]);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) void load();
  }, [loading, isAdmin, load]);

  const directoryIds = useMemo(() => new Set((directory ?? []).map((club) => club.id)), [directory]);
  const pendingNew = useMemo(
    () => unpublished.filter((club) => !directoryIds.has(club.id)),
    [unpublished, directoryIds]
  );
  const edited = useMemo(
    () => unpublished.filter((club) => directoryIds.has(club.id)),
    [unpublished, directoryIds]
  );
  const activeCount = (directory ?? []).filter((club) => club.is_active).length;
  const inactiveCount = (directory ?? []).length - activeCount;

  /** Run an admin action, close any modals and refresh the lists. */
  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      setSelected(null);
      await load();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Action failed — please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="admin-page">
        <Spinner label="Loading…" />
      </div>
    );
  }

  const renderGrid = (clubs: ClubWithId[], kind: DetailKind) => (
    <div className="admin-grid">
      {clubs.map((club, index) => (
        <ClubCard key={club.id} club={club} index={index} onClick={() => setSelected({ club, kind })} />
      ))}
    </div>
  );

  return (
    <div className="admin-page">
      <h1 className="admin-title">Admin Portal</h1>

      {directory === null ? (
        <Spinner label="Loading clubs…" />
      ) : (
        <>
          {pendingNew.length > 0 && (
            <section className="admin-section">
              <h2 className="section-header">Pending new clubs ({pendingNew.length})</h2>
              {renderGrid(pendingNew, 'new')}
            </section>
          )}

          {edited.length > 0 && (
            <section className="admin-section">
              <h2 className="section-header">Edited clubs ({edited.length})</h2>
              {renderGrid(edited, 'edited')}
            </section>
          )}

          {directory.length > 0 && (
            <section className="admin-section">
              <h2 className="section-header">
                Published clubs ({activeCount} active, {inactiveCount} inactive)
              </h2>
              {renderGrid(directory, 'published')}
            </section>
          )}

          {pendingNew.length === 0 && edited.length === 0 && directory.length === 0 && (
            <EmptyState message="No clubs to display." />
          )}
        </>
      )}

      {selected && (
        <ClubDetailModal
          club={selected.club}
          onClose={() => setSelected(null)}
          showJoin={false}
          actions={
            selected.kind === 'published' ? (
              <>
                <button
                  className="btn-outline"
                  disabled={busy}
                  onClick={() => {
                    setEditingClub(selected.club);
                    setSelected(null);
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn-outline"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      selected.club.is_active
                        ? setClubInactive(selected.club.id, selected.club)
                        : setClubActive(selected.club.id, selected.club)
                    )
                  }
                >
                  {selected.club.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="btn-destructive"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${selected.club.name}"? This removes its members, join requests and events.`
                      )
                    ) {
                      void runAction(() => deleteClub(selected.club.id, selected.club));
                    }
                  }}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => void runAction(() => approveClub(selected.club.id, selected.club))}
                >
                  Approve
                </button>
                <button
                  className="btn-destructive"
                  disabled={busy}
                  onClick={() => void runAction(() => rejectClub(selected.club.id, selected.club))}
                >
                  Reject
                </button>
              </>
            )
          }
        />
      )}

      {editingClub && (
        <ClubFormModal
          open
          onClose={() => setEditingClub(null)}
          club={editingClub}
          title="Edit club"
          submitLabel="Publish changes"
          onSubmit={async (clubId, club) => {
            await adminWriteClub(clubId, club);
            setEditingClub(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
