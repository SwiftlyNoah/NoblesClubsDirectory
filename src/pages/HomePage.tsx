import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  fetchClubDirectory,
  fetchMemberCounts,
  getClub,
  type ClubWithId,
} from '../data';
import { ClubCard } from '../components/ClubCard';
import { ClubDetailModal } from '../components/ClubDetailModal';
import { SubjectFilters } from '../components/SubjectFilters';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import bgvid from '../assets/bgvid.mp4';
import './HomePage.css';

export function HomePage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { clubId } = useParams();

  const [clubs, setClubs] = useState<ClubWithId[] | null>(null);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deepLinkedClub, setDeepLinkedClub] = useState<ClubWithId | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setClubs(await fetchClubDirectory(isAdmin));
      } catch (error) {
        console.error('Failed to load club directory:', error);
        setClubs([]);
      }
    })();
  }, [isAdmin]);

  // Member counts are reader-gated to signed-in users.
  useEffect(() => {
    if (!user) {
      setMemberCounts({});
      return;
    }
    fetchMemberCounts().then(setMemberCounts).catch(() => {});
  }, [user]);

  // Deep link: /club/:clubId may reference a club not in the loaded list
  // (e.g. inactive). Resolve it directly.
  const selectedClub = useMemo(
    () => clubs?.find((club) => club.id === clubId) ?? deepLinkedClub,
    [clubs, clubId, deepLinkedClub]
  );

  useEffect(() => {
    setDeepLinkedClub(null);
    if (!clubId || !clubs || clubs.some((club) => club.id === clubId)) return;
    getClub(clubId).then((club) => {
      if (club) setDeepLinkedClub(club);
    });
  }, [clubId, clubs]);

  const filtered = useMemo(() => {
    if (!clubs) return [];
    const term = search.trim().toLowerCase();
    return clubs.filter(
      (club) =>
        (selectedSubject === null || club.subject === selectedSubject) &&
        (term === '' ||
          club.name.toLowerCase().includes(term) ||
          club.description?.toLowerCase().includes(term))
    );
  }, [clubs, selectedSubject, search]);

  return (
    <div>
      <div className="home-hero">
        <video autoPlay muted loop playsInline src={bgvid} />
        <div className="home-hero-overlay">
          <h1 className="home-hero-title">Nobles Clubs and Organizations</h1>
        </div>
      </div>

      <div className="home-content">
        <div className="home-toolbar">
          <input
            className="text-field home-search"
            type="search"
            placeholder="Search clubs…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="home-results-count">
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </span>
          <button className="btn-outline" onClick={() => setFiltersOpen((open) => !open)}>
            Subjects
          </button>
        </div>

        {filtersOpen && (
          <div className="home-filters">
            <div className="subject-filters">
              <button
                className={`chip${selectedSubject === null ? ' selected' : ''}`}
                onClick={() => setSelectedSubject(null)}
              >
                All Clubs
              </button>
              <SubjectFilters selected={selectedSubject} onChange={setSelectedSubject} />
            </div>
          </div>
        )}

        {clubs === null ? (
          <Spinner label="Loading clubs…" />
        ) : filtered.length === 0 ? (
          <EmptyState message="No clubs match — try clearing the search or filters." />
        ) : (
          <div className="home-grid">
            {filtered.map((club, index) => (
              <ClubCard
                key={club.id}
                club={club}
                index={index}
                memberCount={memberCounts[club.id]}
                onClick={() => navigate(`/club/${club.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedClub && <ClubDetailModal club={selectedClub} onClose={() => navigate('/')} />}
    </div>
  );
}
