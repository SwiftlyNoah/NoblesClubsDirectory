// Single Firebase import point for the shared clubs data layer.
//
// PORTABILITY CONTRACT: files in data/ may import Firebase ONLY through this
// re-export, and only names that exist in both the web SDK and the
// @react-native-firebase modular API. The same data/ folder is mirrored into
// the Expo app (react/lib/clubsData/) with just this file's import source
// changed to the app's firebase shim. No firebase/storage, no firebase/auth
// here — those are platform concerns and live outside data/.
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
} from '../lib/firebase';
