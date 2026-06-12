import { useCallback, useEffect, useState } from 'react';
import { listMembers, removeMember, type MemberEntry } from '../data';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';
import './Panels.css';

interface MembersPanelProps {
  clubId: string;
  /** Whether the viewer may remove members (leader/advisor/admin). */
  canManage: boolean;
}

export function MembersPanel({ clubId, canManage }: MembersPanelProps) {
  const [members, setMembers] = useState<Record<string, MemberEntry> | null>(null);

  const load = useCallback(async () => {
    setMembers(await listMembers(clubId));
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (members === null) return <Spinner label="Loading members…" />;

  const entries = Object.entries(members).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  if (entries.length === 0) {
    return <EmptyState icon="👥" message="No members yet. Share the club to get people joining!" />;
  }

  return (
    <ul className="panel-list">
      {entries.map(([uid, member], index) => (
        <li key={uid} className="panel-row fade-in-row" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
          <div>
            <div className="panel-row-name">{member.name || member.email}</div>
            <div className="panel-row-sub">
              <a href={`mailto:${member.email}`}>{member.email}</a>
              {' · joined '}
              {new Date(member.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          {canManage && (
            <button
              className="btn-destructive"
              onClick={async () => {
                await removeMember(uid, clubId);
                await load();
              }}
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
