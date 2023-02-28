import { initializeApp } from 'firebase/app';
import { getDatabase,ref,onValue,set } from 'firebase/database';
import { getStorage,ref as sRef,getDownloadURL,uploadBytes } from 'firebase/storage';
import { getAuth,signInWithPopup,GoogleAuthProvider } from 'firebase/auth';
import { reactive } from 'vue';

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
const storage = getStorage(app);

function setupDB(callback) {
  const dataRef = ref(db,"/");
  onValue(dataRef,snapshot => {
    callback(snapshot.val());
  });
}

function writeEntry(key,entry) {
  set(ref(db,`/${key}`),entry);
}

async function signIn() {
  const provider = new GoogleAuthProvider();
  const auth = getAuth();
  const result = await signInWithPopup(auth,provider);
  return {
    full_name: result.user.displayName,
    first_name: result.user.displayName.split(" ")[0],
    email: result.user.email
  };
}

const imageURLCache = reactive({});
async function getImageURL(image) {
  if ( ! image.startsWith("i" ) ) return "/pictures/" + image;
  console.log(imageURLCache)
  if ( imageURLCache[image] ) {
    return imageURLCache[image];
  } else {
    const url = await getDownloadURL(sRef(storage,image));
    imageURLCache[image] = url;
    return url;
  }
}

async function uploadImage(file) {
  const imageName = randomHexID();
  const imageRef = sRef(storage,imageName);
  await uploadBytes(imageRef,file);
  imageURLCache[imageName] = await getDownloadURL(imageRef);
  return imageName;
}

function randomHexID() {
  let result = "";
  for ( let i = 0; i < 16; i++ ) result += Math.floor(Math.random() * 16).toString(16);
  return result;
}

export { setupDB,writeEntry,signIn,getImageURL,uploadImage,randomHexID };