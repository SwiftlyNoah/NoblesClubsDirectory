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
import { ensureUserRecord, getUser, setPersonType as savePersonType } from '../data';
import { userIsAdmin } from '../data';
import { probePersonType } from './roles';

// Same provider id the Expo app uses (react/config/veracross.ts). On web,
// Veracross's missing end_session endpoint matters less than on the app:
// firebase signOut ends our session, and the shared-computer SSO cookie
// concern is accepted for now.
const OIDC_PROVIDER_ID = 'oidc.veracross';

const PERSON_TYPE_CACHE_KEY = 'clubs.personType';

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
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function firstNameOf(user: User, claims: Record<string, unknown>): string {
  const name = (claims.name as string) || user.displayName || '';
  return name.split(' ')[0] || '';
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
    const first = firstNameOf(fbUser, claims);

    setPersonId(pid);
    setEmail(resolvedEmail);
    setFirstName(first || null);

    await ensureUserRecord(fbUser.uid, {
      first,
      email: resolvedEmail ?? '',
      veracrossPersonId: pid ?? undefined,
    });

    setIsAdmin(await userIsAdmin(fbUser.uid));

    // person_type: sessionStorage → RTDB record → Veracross probe (cached back).
    const cached = sessionStorage.getItem(PERSON_TYPE_CACHE_KEY) as PersonType | null;
    if (cached === 'student' || cached === 'faculty') {
      setPersonType(cached);
      return;
    }
    const record = await getUser(fbUser.uid);
    if (record?.person_type) {
      setPersonType(record.person_type);
      sessionStorage.setItem(PERSON_TYPE_CACHE_KEY, record.person_type);
      return;
    }
    if (pid) {
      const probed = await probePersonType(tokenResult.token, pid);
      if (probed) {
        setPersonType(probed);
        sessionStorage.setItem(PERSON_TYPE_CACHE_KEY, probed);
        await savePersonType(fbUser.uid, probed);
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
        sessionStorage.removeItem(PERSON_TYPE_CACHE_KEY);
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
    await signOut(getAuth());
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
      signIn,
      signOutUser,
    }),
    [loading, user, personId, email, firstName, isAdmin, personType, myClubs, signIn, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
