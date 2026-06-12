import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import logoWhite from '../assets/logo_white.png';
import './TopBar.css';

export function TopBar() {
  const { user, firstName, isAdmin, loading, signIn, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand" onClick={close}>
        <img src={logoWhite} alt="Nobles" className="topbar-logo" />
        <span className="topbar-title">Clubs</span>
      </Link>

      <button
        className="topbar-hamburger"
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        ☰
      </button>

      <nav className={`topbar-nav${menuOpen ? ' open' : ''}`}>
        <NavLink to="/" end className="topbar-link" onClick={close}>
          Directory
        </NavLink>
        <NavLink to="/calendar" className="topbar-link" onClick={close}>
          Calendar
        </NavLink>
        {user && (
          <NavLink to="/my-clubs" className="topbar-link" onClick={close}>
            My Clubs
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin" className="topbar-link" onClick={close}>
            Admin
          </NavLink>
        )}
        {!loading &&
          (user ? (
            <button
              className="topbar-auth"
              onClick={() => {
                close();
                void signOutUser();
              }}
            >
              Sign out{firstName ? ` (${firstName})` : ''}
            </button>
          ) : (
            <button
              className="topbar-auth"
              onClick={() => {
                close();
                void signIn();
              }}
            >
              Sign in with Veracross
            </button>
          ))}
      </nav>
    </header>
  );
}
