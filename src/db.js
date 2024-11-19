import { initializeApp } from 'firebase/app';
import { query, ref, get, orderByChild, equalTo, getDatabase, set } from 'firebase/database';
import { getStorage, ref as sRef, getDownloadURL, uploadBytes } from 'firebase/storage';
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

// Helper function: Perform an operation for each leader
function processLeaders(entry, operation) {
  if (!entry.leader) return [];
  return Object.entries(entry.leader).map(([leaderKey, leader]) => {
    if (leaderKey) {
      return operation(leaderKey, leader);
    }
    return null;
  }).filter(Boolean); // Remove any null results
}

// Helper function: Perform an operation for each advisor
function processAdvisors(entry, operation) {
  if (!entry.advisor) return [];
  return Object.entries(entry.advisor).map(([advisorKey, advisor]) => {
    if (advisorKey) {
      return operation(advisorKey, advisor);
    }
    return null;
  }).filter(Boolean); // Remove any null results
}

async function fetchClubDirectory(isAdmin) {
  const dataRef = ref(db, "/clubs/directory/");

  const clubsQuery = isAdmin
    ? query(dataRef) // Admin gets all clubs
    : query(dataRef, orderByChild("is_active"), equalTo(true)); // Non-admin gets active clubs only

  try {
    const snapshot = await get(clubsQuery);
    const clubs = snapshot.val() || {};

    // Sort the clubs by name in ascending order
    const sortedClubs = Object.entries(clubs)
      .sort(([, clubA], [, clubB]) => clubA.name.localeCompare(clubB.name))
      .reduce((result, [key, value]) => {
        result[key] = value;
        return result;
      }, {});

    return sortedClubs;
  } catch (error) {
    console.error("Error fetching club directory:", error);
    throw error;
  }
}

// Fetch unpublished clubs data
async function fetchUnpublishedClubs() {
  const dataRef = ref(db, "/clubs/unpublished/");
  const clubsQuery = query(dataRef);

  return get(clubsQuery).then((snapshot) => {
    const clubs = snapshot.val();
    console.log("Unpublished Clubs:", clubs);
    return clubs;
  });
}

async function userIsAdmin(userId) {
  const dataRef = ref(db, `/clubs/admins/${userId}`);
  const adminQuery = query(dataRef);

  try {
    const snapshot = await get(adminQuery);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    return null;
  }
}

function submitClub(key, entry) {
  console.log(entry);
  set(ref(db, `/clubs/unpublished/${key}`), entry);
}

async function approveClub(key, entry) {
  try {
    const unpublishedRef = ref(db, `/clubs/unpublished/${key}`);
    const directoryRef = ref(db, `/clubs/directory/${key}`);

    // Remove the object from clubs/unpublished/key
    const removeUnpublished = set(unpublishedRef, null);

    // Create the new club in clubs/directory/key
    const addToDirectory = set(directoryRef, entry);

    // Process leaders and advisors
    const userUpdates = [
      ...processLeaders(entry, (leaderKey, leader) => {
        const userClubRef = ref(db, `/users/public/${leaderKey}/clubs/${key}`);
        return set(userClubRef, {
          image: entry.image,
          name: entry.name,
          subject: entry.subject,
          approval_status: "approved",
          ...(leader.role ? { role: leader.role } : {}),
        });
      }),
      ...processAdvisors(entry, (advisorKey) => {
        const userClubRef = ref(db, `/users/public/${advisorKey}/clubs/${key}`);
        return set(userClubRef, {
          image: entry.image,
          name: entry.name,
          subject: entry.subject,
          approval_status: "approved",
        });
      }),
    ];

    await Promise.all([removeUnpublished, addToDirectory, ...userUpdates]);
    console.log(`Club "${entry.name}" approved and updates completed.`);
  } catch (error) {
    console.error("Error approving club:", error);
  }
}

async function rejectClub(key, entry) {
  try {
    const unpublishedRef = ref(db, `/clubs/unpublished/${key}`);

    const userUpdates = [
      ...processLeaders(entry, (leaderKey) => {
        const userClubRef = ref(db, `/users/public/${leaderKey}/clubs/${key}`);
        return set(userClubRef, null);
      }),
      ...processAdvisors(entry, (advisorKey) => {
        const userClubRef = ref(db, `/users/public/${advisorKey}/clubs/${key}`);
        return set(userClubRef, null);
      }),
    ];

    const removeUnpublished = set(unpublishedRef, null);

    await Promise.all([removeUnpublished, ...userUpdates]);
    console.log(`Club "${entry.name}" rejected and removed from unpublished.`);
  } catch (error) {
    console.error("Error rejecting club:", error);
  }
}

async function deleteClub(key, entry) {
  try {
    const unpublishedRef = ref(db, `/clubs/unpublished/${key}`);
    const directoryRef = ref(db, `/clubs/directory/${key}`);

    const userUpdates = [
      ...processLeaders(entry, (leaderKey) => {
        const userClubRef = ref(db, `/users/public/${leaderKey}/clubs/${key}`);
        return set(userClubRef, null);
      }),
      ...processAdvisors(entry, (advisorKey) => {
        const userClubRef = ref(db, `/users/public/${advisorKey}/clubs/${key}`);
        return set(userClubRef, null);
      }),
    ];

    const removeUnpublished = set(unpublishedRef, null);
    const removePublished = set(directoryRef, null);

    await Promise.all([removeUnpublished, removePublished, ...userUpdates]);
    console.log(`Club "${entry.name}" deleted from all lists.`);
  } catch (error) {
    console.error("Error deleting club:", error);
  }
}

async function setClubActive(key, entry) {
  try {
    const directoryRef = ref(db, `/clubs/directory/${key}`);

    // Update the club's is_active field in the published list
    const updateIsActive = set(directoryRef, { ...entry, is_active: true });

    // Add the club back to leaders' and advisors' lists
    const userUpdates = [
      ...processLeaders(entry, (leaderKey, leader) => {
        const userClubRef = ref(db, `/users/public/${leaderKey}/clubs/${key}`);
        return set(userClubRef, {
          image: entry.image,
          name: entry.name,
          subject: entry.subject,
          approval_status: "active",
          ...(leader.role ? { role: leader.role } : {}),
        });
      }),
      ...processAdvisors(entry, (advisorKey) => {
        const userClubRef = ref(db, `/users/public/${advisorKey}/clubs/${key}`);
        return set(userClubRef, {
          image: entry.image,
          name: entry.name,
          subject: entry.subject,
          approval_status: "active",
        });
      }),
    ];

    await Promise.all([updateIsActive, ...userUpdates]);
    console.log(`Club "${entry.name}" marked as active and added back to leader and advisor lists.`);
  } catch (error) {
    console.error("Error marking club as active:", error);
  }
}

async function setClubInactive(key, entry) {
  try {
    const directoryRef = ref(db, `/clubs/directory/${key}`);

    const updateIsActive = set(directoryRef, { ...entry, is_active: false });

    const userUpdates = [
      ...processLeaders(entry, (leaderKey) => {
        const userClubRef = ref(db, `/users/public/${leaderKey}/clubs/${key}`);
        return set(userClubRef, null);
      }),
      ...processAdvisors(entry, (advisorKey) => {
        const userClubRef = ref(db, `/users/public/${advisorKey}/clubs/${key}`);
        return set(userClubRef, null);
      }),
    ];

    await Promise.all([updateIsActive, ...userUpdates]);
    console.log(`Club "${entry.name}" marked as inactive and removed from leader and advisor lists.`);
  } catch (error) {
    console.error("Error marking club as inactive:", error);
  }
}

async function adminWriteClub(key, entry) {
  try {
    const directoryRef = ref(db, `/clubs/directory/${key}`);

    // Write the club to the published list
    const publishClub = set(directoryRef, entry);

    // Process leaders and advisors
    const userUpdates = [
      ...processLeaders(entry, (leaderKey, leader) => {
        const userClubRef = ref(db, `/users/public/${leaderKey}/clubs/${key}`);
        return set(userClubRef, {
          image: entry.image,
          name: entry.name,
          subject: entry.subject,
          ...(leader.role ? { role: leader.role } : {}),
        });
      }),
      ...processAdvisors(entry, (advisorKey) => {
        const userClubRef = ref(db, `/users/public/${advisorKey}/clubs/${key}`);
        return set(userClubRef, {
          image: entry.image,
          name: entry.name,
          subject: entry.subject,
        });
      }),
    ];

    // Execute all updates
    await Promise.all([publishClub, ...userUpdates]);

    console.log(`Club "${entry.name}" successfully written to the directory.`);
  } catch (error) {
    console.error("Error writing club to directory:", error);
    throw error;
  }
}

async function findUserWithEmail(email) {
  const usersRef = ref(db, "/users/public");
  const emailQuery = query(usersRef, orderByChild("email"), equalTo(email));

  try {
    const snapshot = await get(emailQuery);
    if (snapshot.exists()) {
      const user = snapshot.val();
      const userId = Object.keys(user)[0];
      return { ...user[userId], uid: userId };
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
    return snapshot.exists() ? { ...snapshot.val(), uid } : null;
  } catch (error) {
    console.error("Error fetching user by UID:", error);
    return null;
  }
}

async function fetchMyClubs(uid) {
  const myClubsRef = ref(db, `/users/public/${uid}/clubs`);

  try {
    const snapshot = await get(myClubsRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function signIn() {
  const provider = new GoogleAuthProvider();
  const auth = getAuth();

  try {
    const result = await signInWithPopup(auth, provider);

    if (!result.user.email.endsWith("@nobles.edu")) return;

    const existingMethods = await fetchSignInMethodsForEmail(auth, result.user.email);

    if (existingMethods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD)) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      try {
        await linkWithCredential(auth.currentUser, credential);
      } catch (linkError) {
        if (linkError.code !== "auth/provider-already-linked") throw linkError;
      }
    }

    return result.user.uid;
  } catch (error) {
    console.error("Sign-in error:", error);
  }
}

const imageURLCache = reactive({});
async function getImageURL(image) {
  if (!image) return null;
  const url = await getDownloadURL(sRef(storage, `/clubs/${image}`));
  imageURLCache[image] = url;
  return url;
}

async function uploadImage(file) {
  const imageName = randomID();
  const imageRef = sRef(storage, `/clubs/${imageName}`);
  await uploadBytes(imageRef, file);
  imageURLCache[imageName] = await getDownloadURL(imageRef);
  return imageName;
}

function randomID() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 20 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

export {
  signIn,
  userIsAdmin,
  fetchClubDirectory,
  fetchUnpublishedClubs,
  submitClub,
  approveClub,
  rejectClub,
  deleteClub,
  setClubActive,
  setClubInactive,
  adminWriteClub,
  fetchMyClubs,
  findUserWithEmail,
  getUser,
  getImageURL,
  uploadImage,
  randomID,
};
