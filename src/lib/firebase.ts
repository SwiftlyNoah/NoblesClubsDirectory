// Firebase initialization for the clubs website.
//
// These are public client config values (the same ones the previous Vue site
// shipped); access control is enforced by Auth + the security rules in
// database.rules.json / storage.rules, not by hiding the config.
import { getApps, initializeApp } from 'firebase/app';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAZF3SXRiTIbuodIVaOLSWp0YzqXSAz354',
  authDomain: 'nobles-20183.firebaseapp.com',
  databaseURL: 'https://nobles-20183-default-rtdb.firebaseio.com',
  projectId: 'nobles-20183',
  storageBucket: 'nobles-20183.appspot.com',
  messagingSenderId: '401842201893',
  appId: '1:401842201893:web:bb821a00b8669f164826cc',
};

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  // `npm run dev -- --mode emulator` (or VITE_USE_EMULATOR=1) points the app
  // at the local emulator suite from firebase.json instead of production.
  if (import.meta.env.VITE_USE_EMULATOR) {
    connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
    connectDatabaseEmulator(getDatabase(app), '127.0.0.1', 9000);
    connectStorageEmulator(getStorage(app), '127.0.0.1', 9199);
  }
}

export {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  getIdToken,
  getIdTokenResult,
  OAuthProvider,
} from 'firebase/auth';
export {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  update,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';
export {
  getStorage,
  ref as storageRef,
  getDownloadURL,
  uploadBytes,
} from 'firebase/storage';
