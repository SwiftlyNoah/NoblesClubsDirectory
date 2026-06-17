/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { User } from 'firebase/auth';
import {
  OAuthProvider,
  getAuth,
  getIdTokenResult,
  getRedirectResult,
  onAuthStateChanged,
  onValue,
  ref,
  getDatabase,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from '../lib/firebase';
import { PATHS, type PersonType, type UserClubEntry } from '../data';
import { ensureUserRecord, getUser, personTypeFromRoles, setUserRoles } from '../data';
import { userIsAdmin } from '../data';
import { probePersonType } from './roles';

// Same provider id the Expo app uses (react/config/veracross.ts).
const OIDC_PROVIDER_ID = 'oidc.veracross';

// Veracross's OIDC server has no end_session endpoint and ignores
// prompt/max_age, so a Firebase signOut leaves the `_veracross_session` SSO
// cookie in place — the next sign-in then silently re-authenticates the same
// person. The Expo app loads this logout page in the same browser/cookie store
// the OIDC flow uses (react/hooks/authContext.ts signOut); on web we do the
// equivalent by opening it first-party in a popup. The cookie lives on
// accounts.veracross.com, so it can only be cleared from that origin.
const VERACROSS_LOGOUT_URL = 'https://accounts.veracross.com/nobles/logout';

// Only Nobles community accounts (students/faculty) get a clubs account. The
// Veracross IdP can authenticate other directory persons (e.g. parents with
// personal emails); those are rejected with a clear message.
const ALLOWED_EMAIL_DOMAIN = '@nobles.edu';

const ROLES_CACHE_KEY = 'clubs.roles';

// Try to clear the Veracross SSO cookie by loading the logout page first-party
// in a popup (the cookie lives on accounts.veracross.com and can only be
// cleared from there), then closing it once it has loaded. Synchronous so it
// can run inside a click gesture — popup blockers reject window.open after an
// async hop, and outside a gesture entirely. Returns false when the popup was
// blocked so the caller can fall back to a full-page redirect.
function openVeracrossLogoutPopup(): boolean {
  try {
    const popup = window.open(VERACROSS_LOGOUT_URL, '_blank', 'width=480,height=600');
    if (popup) {
      window.setTimeout(() => popup.close(), 2500);
      return true;
    }
  } catch {
    // fall through to the blocked path
  }
  return false;
}

// Last resort when the popup is blocked: navigate the whole tab to the logout
// page. A top-level navigation always carries the first-party cookie, so it
// reliably clears the session, at the cost of leaving the SPA (the user lands
// on Veracross's "signed out" page and can return to /clubs).
function redirectToVeracrossLogout(): void {
  window.location.assign(VERACROSS_LOGOUT_URL);
}

export interface AuthState {
  /** True until the initial onAuthStateChanged resolution (and profile load) completes. */
  loading: boolean;
  user: User | null;
  uid: string | null;
  /** Veracross person id from the OIDC identity claim. */
  personId: string | null;
  email: string | null;
  firstName: string | null;
  isAdmin: boolean;
  personType: PersonType | null;
  /** Live view of /users/public/{uid}/clubs. Empty when signed out. */
  myClubs: Record<string, UserClubEntry>;
  /** Sign-in failure surfaced to the UI (e.g. a non-Nobles account). */
  error: string | null;
  /**
   * True when a Veracross SSO session is still active after a failed sign-in
   * and our automatic cookie-clear was blocked — the UI should offer a manual
   * "Sign out of Veracross" action so the user can clear it within a gesture.
   */
  veracrossSessionLingering: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  dismissError: () => void;
  /** Clear the Veracross SSO cookie from a user gesture (popup, redirect fallback). */
  signOutVeracross: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// The Veracross OIDC `name` claim carries the full display name; split it into
// first + last so the user record stores both (leaders see full names in club
// listings). Falls back to the Firebase displayName.
function splitName(user: User, claims: Record<string, unknown>): { first: string; last: string } {
  const full = ((claims.name as string) || user.displayName || '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [personType, setPersonType] = useState<PersonType | null>(null);
  const [myClubs, setMyClubs] = useState<Record<string, UserClubEntry>>({});
  const [error, setError] = useState<string | null>(null);
  const [veracrossSessionLingering, setVeracrossSessionLingering] = useState(false);

  const handleSignedIn = useCallback(async (fbUser: User) => {
    const tokenResult = await getIdTokenResult(fbUser);
    const claims = tokenResult.claims as Record<string, unknown>;
    const identities =
      ((claims.firebase as Record<string, unknown> | undefined)?.identities as
        | Record<string, string[]>
        | undefined) ?? {};
    const pid = identities[OIDC_PROVIDER_ID]?.[0] ?? null;
    const providerEmail =
      fbUser.providerData.find((p) => p.providerId === OIDC_PROVIDER_ID)?.email ?? null;
    const resolvedEmail = (claims.email as string) ?? fbUser.email ?? providerEmail ?? null;
    const { first, last } = splitName(fbUser, claims);

    // Gate on a verified @nobles.edu address. Reject anything else (parents,
    // alumni, unverifiable) before touching the database: sign back out so the
    // user lands logged-out with an explanation rather than half-authenticated.
    if (!resolvedEmail || !resolvedEmail.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
      setError('Please sign in with your Nobles (@nobles.edu) account.');
      await signOut(getAuth());
      // Also end the Veracross SSO session, or the next attempt silently
      // re-authenticates this same wrong account instead of prompting for the
      // user's Nobles credentials. This runs outside a click gesture (the OIDC
      // popup has already closed), so the popup is usually blocked here — when
      // it is, flag it so the banner can offer a one-click manual sign-out,
      // which runs inside a gesture and isn't blocked.
      setVeracrossSessionLingering(!openVeracrossLogoutPopup());
      return;
    }

    setPersonId(pid);
    setEmail(resolvedEmail);
    setFirstName(first || null);

    await ensureUserRecord(fbUser.uid, {
      email: resolvedEmail ?? '',
      first,
      last: last || undefined,
      id: pid ?? undefined,
    });

    setIsAdmin(await userIsAdmin(fbUser.uid));

    // roles: sessionStorage → RTDB record → Veracross probe (cached + persisted
    // back). The web only authenticates students/faculty, so the probed roles
    // string is a single value here.
    const cached = sessionStorage.getItem(ROLES_CACHE_KEY);
    if (cached) {
      setPersonType(personTypeFromRoles(cached));
      return;
    }
    const record = await getUser(fbUser.uid);
    if (record?.roles) {
      setPersonType(personTypeFromRoles(record.roles));
      sessionStorage.setItem(ROLES_CACHE_KEY, record.roles);
      return;
    }
    if (pid) {
      const probed = await probePersonType(tokenResult.token, pid);
      if (probed) {
        setPersonType(probed);
        sessionStorage.setItem(ROLES_CACHE_KEY, probed);
        await setUserRoles(fbUser.uid, probed);
      }
    }
  }, []);

  useEffect(() => {
    const auth = getAuth();
    // Completes the redirect-fallback flow, if one is in flight; harmless otherwise.
    getRedirectResult(auth).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          await handleSignedIn(fbUser);
        } catch (error) {
          console.error('Sign-in processing failed:', error);
        }
      } else {
        setPersonId(null);
        setEmail(null);
        setFirstName(null);
        setIsAdmin(false);
        setPersonType(null);
        sessionStorage.removeItem(ROLES_CACHE_KEY);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [handleSignedIn]);

  // Live "my clubs" subscription.
  useEffect(() => {
    if (!user) {
      setMyClubs({});
      return;
    }
    const clubsRef = ref(getDatabase(), PATHS.userClubs(user.uid));
    return onValue(
      clubsRef,
      (snapshot) => setMyClubs((snapshot.val() as Record<string, UserClubEntry>) ?? {}),
      () => setMyClubs({})
    );
  }, [user]);

  const signIn = useCallback(async () => {
    setError(null);
    setVeracrossSessionLingering(false);
    const auth = getAuth();
    const provider = new OAuthProvider(OIDC_PROVIDER_ID);
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        throw error;
      }
    }
  }, []);

  const signOutUser = useCallback(async () => {
    // Open the logout popup first, while still inside the click gesture, then
    // end the Firebase session. If the popup was blocked even from this gesture,
    // fall back to a full-page redirect once Firebase sign-out has completed.
    const opened = openVeracrossLogoutPopup();
    await signOut(getAuth());
    if (!opened) redirectToVeracrossLogout();
  }, []);

  // Manual Veracross sign-out the banner offers when the automatic clear was
  // blocked. Runs from a click, so the popup is reliably allowed; redirect is
  // the final fallback.
  const signOutVeracross = useCallback(() => {
    setVeracrossSessionLingering(false);
    setError(null);
    if (!openVeracrossLogoutPopup()) redirectToVeracrossLogout();
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
    setVeracrossSessionLingering(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      uid: user?.uid ?? null,
      personId,
      email,
      firstName,
      isAdmin,
      personType,
      myClubs,
      error,
      veracrossSessionLingering,
      signIn,
      signOutUser,
      dismissError,
      signOutVeracross,
    }),
    [
      loading,
      user,
      personId,
      email,
      firstName,
      isAdmin,
      personType,
      myClubs,
      error,
      veracrossSessionLingering,
      signIn,
      signOutUser,
      signOutVeracross,
      dismissError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
