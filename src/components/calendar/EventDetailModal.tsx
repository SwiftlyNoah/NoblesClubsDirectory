import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import {
  deleteEvent,
  describeRRule,
  isClubManager,
  subjectColor,
  type ClubEventWithId,
  type ClubWithId,
} from '../../data';
import { Modal } from '../Modal';

interface EventDetailModalProps {
  event: ClubEventWithId;
  /** Epoch ms of the clicked occurrence (differs from event.start for recurring events). */
  occurrenceStart: number;
  occurrenceEnd: number;
  /** The event's club from the directory, when known (enables the manager check). */
  club?: ClubWithId;
  onClose: () => void;
  /** Open the edit form for this event. */
  onEdit: () => void;
  /** Called after a successful delete so the page can refetch. */
  onDeleted: () => void;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatOccurrence(start: number, end: number, allDay: boolean | undefined): string {
  const day = new Date(start).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  if (allDay) return `${day} (all day)`;
  return `${day}, ${formatTime(start)} – ${formatTime(end)}`;
}

export function EventDetailModal({
  event,
  occurrenceStart,
  occurrenceEnd,
  club,
  onClose,
  onEdit,
  onDeleted,
}: EventDetailModalProps) {
  const { uid, isAdmin } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = isAdmin || (club !== undefined && isClubManager(club, uid));
  const accent = subjectColor(event.clubSubject);
  const recurrence = event.isRecurring ? describeRRule(event.rrule) : null;

  const handleDelete = async () => {
    if (!window.confirm('Delete this event? All of its occurrences will be removed.')) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteEvent(event.id);
      onDeleted();
      onClose();
    } catch (deleteError) {
      console.error('Failed to delete event:', deleteError);
      setError('Failed to delete the event. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={event.title}>
      <div className="event-detail">
        <div className="event-detail-club">
          <Link to={`/club/${event.clubId}`} className="btn-link" onClick={onClose}>
            {event.clubName}
          </Link>
          <span className="badge" style={{ color: accent, background: `${accent}1a` }}>
            {event.clubSubject}
          </span>
        </div>

        <dl className="event-detail-facts">
          <dt>When</dt>
          <dd>{formatOccurrence(occurrenceStart, occurrenceEnd, event.allDay)}</dd>
          {recurrence && (
            <>
              <dt>Repeats</dt>
              <dd>{recurrence}</dd>
            </>
          )}
          {event.location?.trim() && (
            <>
              <dt>Location</dt>
              <dd>{event.location}</dd>
            </>
          )}
          {event.description?.trim() && (
            <>
              <dt>Description</dt>
              <dd className="event-detail-description">{event.description}</dd>
            </>
          )}
          {event.externalLink?.trim() && (
            <>
              <dt>Link</dt>
              <dd>
                <a href={event.externalLink} target="_blank" rel="noopener noreferrer">
                  {event.externalLink}
                </a>
              </dd>
            </>
          )}
        </dl>

        {error && <p className="event-detail-error">{error}</p>}

        {canManage && (
          <div className="event-detail-actions">
            <button className="btn-outline" onClick={onEdit} disabled={deleting}>
              Edit
            </button>
            <button className="btn-destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
