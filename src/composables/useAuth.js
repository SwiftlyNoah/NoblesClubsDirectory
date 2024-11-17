import { ref } from "vue";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { getUser } from "../db";

const auth = getAuth();
const userData = ref(null);

export function useAuth() {
  // Initialize user data
  if (!userData.value) {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const storedUser = JSON.parse(localStorage.getItem("userData"));
        if (!storedUser || storedUser.uid !== firebaseUser.uid) {
          const user = await getUser(firebaseUser.uid);
          userData.value = user;
          localStorage.setItem("userData", JSON.stringify(user));
        } else {
          userData.value = storedUser;
        }
      } else {
        localStorage.removeItem("userData");
        userData.value = null;
      }
    });
  }

  return { userData };
}
