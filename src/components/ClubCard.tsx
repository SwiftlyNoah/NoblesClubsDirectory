import { clubImageSrc, subjectColor, type ClubWithId } from '../data';
import './ClubCard.css';

interface ClubCardProps {
  club: ClubWithId;
  onClick: () => void;
  /** Render order index for the staggered entrance animation. */
  index?: number;
}

export function ClubCard({ club, onClick, index = 0 }: ClubCardProps) {
  const accent = subjectColor(club.subject);
  const image = clubImageSrc(club);

  return (
    <button
      className={`club-card fade-in-row${club.is_active ? '' : ' inactive'}`}
      style={{ borderLeftColor: accent, animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={onClick}
    >
      <div className="club-card-image">
        {image ? <img src={image} alt="" loading="lazy" /> : <div className="club-card-placeholder" />}
      </div>
      <div className="club-card-body">
        <div className="badge" style={{ color: accent, background: `${accent}1a` }}>
          {club.subject}
        </div>
        <div className="club-card-name">{club.name}</div>
        <p className="club-card-description">{club.description}</p>
        <div className="club-card-footer">
          {!club.is_active && <span className="club-card-inactive-tag">Inactive</span>}
          {(club.join_policy ?? 'open') === 'approval' && (
            <span className="club-card-policy">Approval required</span>
          )}
        </div>
      </div>
    </button>
  );
}
