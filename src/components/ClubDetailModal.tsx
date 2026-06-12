import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  clubImageSrc,
  fetchEventsForClub,
  expandOccurrences,
  isClubManager,
  subjectColor,
  type ClubEventWithId,
  type ClubWithId,
} from '../data';
import { JoinButton } from './JoinButton';
import { MembersPanel } from './MembersPanel';
import { JoinRequestsPanel } from './JoinRequestsPanel';
import { Modal } from './Modal';
import './ClubDetailModal.css';

interface ClubDetailModalProps {
  club: ClubWithId;
  onClose: () => void;
  /** Optional extra footer actions (edit listing, admin approve/reject). */
  actions?: React.ReactNode;
  /** Hide the join button (e.g. pending submissions that aren't joinable yet). */
  showJoin?: boolean;
}

type Tab = 'about' | 'members' | 'requests';

const UPCOMING_WINDOW_DAYS = 30;

function peopleList(people: Record<string, { name: string; email: string }> | undefined) {
  const entries = Object.values(people ?? {});
  if (entries.length === 0) return null;
  return entries.map((person, index) => (
    <span key={person.email}>
      <a href={`mailto:${person.email}`}>{person.name}</a>
      {index < entries.length - 1 ? ', ' : ''}
    </span>
  ));
}

export function ClubDetailModal({ club, onClose, actions, showJoin = true }: ClubDetailModalProps) {
  const { uid, isAdmin, user } = useAuth();
  const [tab, setTab] = useState<Tab>('about');
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<{ event: ClubEventWithId; start: number }[]>([]);

  const canManage = isAdmin || isClubManager(club, uid);
  const accent = subjectColor(club.subject);
  const image = clubImageSrc(club);

  useEffect(() => {
    setTab('about');
  }, [club.id]);

  // Upcoming events preview (about tab).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const events = await fetchEventsForClub(club.id);
        const now = Date.now();
        const horizon = now + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        const occurrences = events
          .flatMap((event) =>
            expandOccurrences(event, now, horizon).map((occurrence) => ({
              event,
              start: occurrence.start,
            }))
          )
          .sort((a, b) => a.start - b.start)
          .slice(0, 3);
        if (!cancelled) setUpcoming(occurrences);
      } catch {
        // Events are a nice-to-have on the detail card; ignore failures.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [club.id]);

  return (
    <Modal open onClose={onClose} title={club.name} width={760}>
      <div className="club-detail">
        {canManage && (
          <div className="club-detail-tabs">
            <button className={`chip${tab === 'about' ? ' selected' : ''}`} onClick={() => setTab('about')}>
              About
            </button>
            <button className={`chip${tab === 'members' ? ' selected' : ''}`} onClick={() => setTab('members')}>
              Members
            </button>
            {(club.join_policy ?? 'open') === 'approval' && (
              <button className={`chip${tab === 'requests' ? ' selected' : ''}`} onClick={() => setTab('requests')}>
                Requests{requestCount ? ` (${requestCount})` : ''}
              </button>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div className="club-detail-about">
            {image && <img className="club-detail-image" src={image} alt={club.name} />}
            <div className="badge" style={{ color: accent, background: `${accent}1a` }}>
              {club.subject}
            </div>
            {!club.is_active && <p className="club-detail-inactive">This club is currently inactive.</p>}
            {club.description && <p className="club-detail-description">{club.description}</p>}
            <dl className="club-detail-facts">
              {club.meeting_room?.trim() && (
                <>
                  <dt>Meeting room</dt>
                  <dd>{club.meeting_room}</dd>
                </>
              )}
              {club.leader && Object.keys(club.leader).length > 0 && (
                <>
                  <dt>Student leader{Object.keys(club.leader).length === 1 ? '' : 's'}</dt>
                  <dd>{peopleList(club.leader)}</dd>
                </>
              )}
              {club.advisor && Object.keys(club.advisor).length > 0 && (
                <>
                  <dt>Faculty advisor{Object.keys(club.advisor).length === 1 ? '' : 's'}</dt>
                  <dd>{peopleList(club.advisor)}</dd>
                </>
              )}
              {club.sign_up?.trim() && (
                <>
                  <dt>How to sign up</dt>
                  <dd>{club.sign_up}</dd>
                </>
              )}
            </dl>

            {user && upcoming.length > 0 && (
              <div className="club-detail-events">
                <div className="section-header">Upcoming events</div>
                <ul>
                  {upcoming.map(({ event, start }) => (
                    <li key={`${event.id}-${start}`}>
                      <span className="club-detail-event-title">{event.title}</span>{' '}
                      <span className="club-detail-event-date">
                        {new Date(start).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {!event.allDay &&
                          `, ${new Date(start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/calendar" className="btn-link" onClick={onClose}>
                  See all on the calendar
                </Link>
              </div>
            )}

            <div className="club-detail-footer">
              {showJoin && <JoinButton club={club} />}
              {actions}
            </div>
          </div>
        )}

        {tab === 'members' && canManage && <MembersPanel clubId={club.id} canManage={canManage} />}
        {tab === 'requests' && canManage && (
          <JoinRequestsPanel club={club} onCountChange={setRequestCount} />
        )}
      </div>
    </Modal>
  );
}
