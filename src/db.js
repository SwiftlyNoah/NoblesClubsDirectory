import { initializeApp } from 'firebase/app';
import { query, ref, get, orderByChild, equalTo, onValue, getDatabase, set } from 'firebase/database';
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

function fetchClubDirectory(callback) {
  const clubsQuery = ref(db, "/clubs/directory/");

  onValue(clubsQuery, snapshot => {
    callback(snapshot.val());
  });
}

function fetchUnpublishedClubs(callback) {
  const dataRef = ref(db, "/clubs/unpublished/");
  const clubsQuery = query(dataRef);

  onValue(clubsQuery, snapshot => {
    callback(snapshot.val());
  });
}

async function userIsAdmin(userId) {
  const dataRef = ref(db, `/clubs/admins/${userId}`);
  const adminQuery = query(dataRef);

  try {
    const snapshot = await get(adminQuery);
    if (snapshot.exists()) {
      console.log(snapshot.val());
      return snapshot.val();
    } 
    else {
      return null;
    }
  } catch (error) {
    return null;
  }
}


function submitClub(key,entry) {
  console.log(entry);
  set(ref(db,`/clubs/unpublished/${key}`),entry);
}

async function findUserWithEmail(email) {
  const usersRef = ref(db, "/users/public");
  const emailQuery = query(usersRef, orderByChild("email"), equalTo(email));

  try {
    const snapshot = await get(emailQuery);
    if (snapshot.exists()) {
      const user = snapshot.val();
      const userId = Object.keys(user)[0];
      const userData = user[userId];

      return { ...userData, uid: userId };
    } else {
      console.log(`User not found with email: ${email}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

async function getUser(uid) {
  const userRef = ref(db, `/users/public/${uid}`);

  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const user = snapshot.val();

      return { ...user, uid: uid };
    } else {
      console.log(`User not found with UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by UID:", error);
    return null;
  }
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

    return result.user.uid;

  } catch (error) {
    console.error("Sign-in error:", error);
  }
}

const imageURLCache = reactive({});
async function getImageURL(image) {
    if (image == null) return null
    const url = await getDownloadURL(sRef(storage, "/clubs/" + image));
    imageURLCache[image] = url;
    return url;
}

async function uploadImage(file) {
  const imageName = randomID();
  const imageRef = sRef(storage, "/clubs/" + imageName);
  await uploadBytes(imageRef, file);
  imageURLCache[imageName] = await getDownloadURL(imageRef);
  return imageName;
}

function randomID() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export { signIn, userIsAdmin, fetchClubDirectory, fetchUnpublishedClubs, submitClub, findUserWithEmail, getUser, getImageURL, uploadImage, randomID };