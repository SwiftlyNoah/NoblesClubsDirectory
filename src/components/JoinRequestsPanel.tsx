import { useCallback, useEffect, useState } from 'react';
import {
  approveRequest,
  denyRequest,
  listJoinRequests,
  type ClubWithId,
  type JoinRequest,
} from '../data';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';
import './Panels.css';

interface JoinRequestsPanelProps {
  club: ClubWithId;
  /** Called when the pending-request count changes (badge refresh). */
  onCountChange?: (count: number) => void;
}

export function JoinRequestsPanel({ club, onCountChange }: JoinRequestsPanelProps) {
  const [requests, setRequests] = useState<Record<string, JoinRequest> | null>(null);

  const load = useCallback(async () => {
    const loaded = await listJoinRequests(club.id);
    setRequests(loaded);
    onCountChange?.(Object.keys(loaded).length);
  }, [club.id, onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  if (requests === null) return <Spinner label="Loading requests…" />;

  const entries = Object.entries(requests).sort(([, a], [, b]) => a.requestedAt - b.requestedAt);
  if (entries.length === 0) {
    return <EmptyState icon="✅" message="No pending requests." />;
  }

  return (
    <ul className="panel-list">
      {entries.map(([uid, request], index) => (
        <li key={uid} className="panel-row fade-in-row" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
          <div>
            <div className="panel-row-name">{request.name || request.email}</div>
            <div className="panel-row-sub">
              <a href={`mailto:${request.email}`}>{request.email}</a>
              {' · requested '}
              {new Date(request.requestedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
            {request.message && <div className="panel-row-message">“{request.message}”</div>}
          </div>
          <div className="panel-row-actions">
            <button
              className="btn-outline"
              onClick={async () => {
                await approveRequest(club.id, club, uid, request);
                await load();
              }}
            >
              Approve
            </button>
            <button
              className="btn-destructive"
              onClick={async () => {
                await denyRequest(club.id, uid);
                await load();
              }}
            >
              Deny
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
