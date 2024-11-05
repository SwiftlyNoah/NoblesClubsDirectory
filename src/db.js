import { initializeApp } from 'firebase/app';
import { query, ref, orderByChild, equalTo, onValue, getDatabase, set } from 'firebase/database';
import { getStorage,ref as sRef,getDownloadURL,uploadBytes } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, signInWithPopup, fetchSignInMethodsForEmail, linkWithCredential, EmailAuthProvider } from "firebase/auth";
import { reactive } from 'vue';

const firebaseConfig = {
  apiKey: "AIzaSyAZF3SXRiTIbuodIVaOLSWp0YzqXSAz354",
  authDomain: "nobles-20183.firebaseapp.com",
  databaseURL: "https://nobles-20183-default-rtdb.firebaseio.com",
  projectId: "nobles-20183",
  storageBucket: "nobles-20183.appspot.com",
  messagingSenderId: "401842201893",
  appId: "1:401842201893:web:bb821a00b8669f164826cc"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

function setupDB(callback) {
  const dataRef = ref(db, "/clubs/directory/");
  const approvedQuery = query(dataRef, orderByChild("is_approved"), equalTo(true));

  onValue(approvedQuery, snapshot => {
    callback(snapshot.val());
  });
}
function writeEntry(key,entry) {
  set(ref(db,`/clubs/directory/${key}`),entry);
}

async function signIn() {
  const provider = new GoogleAuthProvider();
  const auth = getAuth();

  try {
    // Sign in with Google
    const result = await signInWithPopup(auth, provider);
    
    // Check if the email ends with "@nobles.edu"
    if (!result.user.email.endsWith("@nobles.edu")) return;

    // Fetch existing sign-in methods for this email
    const existingMethods = await fetchSignInMethodsForEmail(auth, result.user.email);

    // If there's an existing email/password account, link the Google account to it
    if (existingMethods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD)) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      // Try linking and handle the "already linked" error gracefully
      try {
        await linkWithCredential(auth.currentUser, credential);
      } catch (linkError) {
        if (linkError.code === "auth/provider-already-linked") {
          // If already linked, proceed without linking
          console.log("Provider already linked. Continuing without linking.");
        } else {
          throw linkError;
        }
      }
    }

    return {
      full_name: result.user.displayName,
      first_name: result.user.displayName.split(" ")[0],
      email: result.user.email
    };

  } catch (error) {
    console.error("Sign-in error:", error);
  }
}

const imageURLCache = reactive({});
async function getImageURL(image) {
    const url = await getDownloadURL(sRef(storage, "/clubs/" + image));
    imageURLCache[image] = url;
    return url;
}

async function uploadImage(file) {
  const imageName = randomHexID();
  const imageRef = sRef(storage, "/clubs/" + imageName);
  await uploadBytes(imageRef, file);
  imageURLCache[imageName] = await getDownloadURL(imageRef);
  return imageName;
}

function randomHexID() {
  let result = "";
  for ( let i = 0; i < 16; i++ ) result += Math.floor(Math.random() * 16).toString(16);
  return result;
}

export { setupDB,writeEntry,signIn,getImageURL,uploadImage,randomHexID };