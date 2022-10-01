import { initializeApp } from 'firebase/app';
import { getDatabase,ref,onValue,set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBFLlV2hcbT_dCbm_fhJHHc8JNdMscuDMI",
  authDomain: "nobles-club-directory.firebaseapp.com",
  databaseURL: "https://nobles-club-directory-default-rtdb.firebaseio.com",
  projectId: "nobles-club-directory",
  storageBucket: "nobles-club-directory.appspot.com",
  messagingSenderId: "661132268880",
  appId: "1:661132268880:web:248d5596ca966078000855"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function setupDB(callback) {
  const dataRef = ref(db,"/");
  onValue(dataRef,snapshot => {
    callback(snapshot.val());
  });
}

function writeEntry(key,entry) {
  set(ref(db,`/${key}`),entry);
}

export { setupDB,writeEntry };