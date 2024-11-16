<template>
  <div>
    <TopBar
      :userData="userData"
      @register-new="registerNew"
      @sign-in="signInPath"
    />
    <div class="video-container">
      <video autoplay muted loop playsinline>
        <source src="@/assets/bgvid.mp4" type="video/mp4" />
      </video>
      <div class="video-filter">
        <div class="container-fluid d-flex align-items-center">
          <p class="title">Nobles Clubs and Organizations</p>
        </div>
      </div>
    </div>
  </div>
  <div class="container-fluid px-4">
    <div class="filters">
      <div class="row filters-menu">
        <div class="col-6">
          <p class="results-count">
            {{ filteredDataKeys.length }} result{{
              filteredDataKeys.length != 1 ? "s" : ""
            }}
          </p>
        </div>
        <div class="col-6 text-end">
          <button
            class="btn btn-success"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapseExample"
            aria-expanded="false"
            aria-controls="collapseExample"
          >
            <i class="fa-solid fa-filter" />
            Subjects
          </button>
        </div>
      </div>
      <FilterBoxes @updateFilters="refilterDataKeys" />
    </div>
    <hr />
    <div
      class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-4"
    >
      <div class="col" v-for="key in filteredDataKeys" :key="key">
        <ClubCard :item="data[key]" @click="() => showModal(key)" />
      </div>
    </div>
    <i v-if="filteredDataKeys.length == 0" class="no-results">No results!</i>
    <ClubModal
      v-show="!editing"
      :selectedItem="data[selectedKey] || { advisor: {}, leader: {} }"
      :userData="userData"
      @openEditing="openEditing"
    />
    <EditModal
      v-show="editing"
      :selectedItem="data[selectedKey] || { advisor: {}, leader: {} }"
      :selectedKey="selectedKey"
      :newRegister="newRegister"
      @closeEditing="closeEditing"
    />
  </div>
</template>

<style>
body {
  overflow-x: hidden;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

.fa-solid {
  padding-right: 0.25rem;
}

.filters {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.filters-menu {
  margin-bottom: 1rem;
}

.results-count {
  margin-top: 0.5rem;
  margin-bottom: 0;
  font-style: italic;
}

.video-container {
  position: relative;
  height: 60vh;
  overflow: hidden;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-filter {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  color: white;
  font-size: clamp(2rem, 5vw, 3rem);
  text-transform: uppercase;
  font-weight: bold;
  font-family: Garamond, serif;
  border-bottom: 5px solid #013366;
  text-align: center;
  margin: auto; /* Centering horizontally */
  position: relative;
  top: 50%; /* Centering vertically */
  transform: translateY(-50%); /* Adjusting vertical alignment */
}

.no-results {
  display: block;
  text-align: center;
  margin-top: 2rem;
}
</style>

<script setup>
import { ref } from "vue";
import {signIn, userIsAdmin, fetchClubDirectory, randomID, getUser } from "../db";
import { SUBJECTS } from "../constants";
import ClubCard from "../components/ClubCard";
import ClubModal from "../components/ClubModal";
import EditModal from "../components/EditModal";
import FilterBoxes from "../components/FilterBoxes";
import TopBar from "../components/TopBar.vue";
import { onAuthStateChanged, getAuth } from "firebase/auth";

// Modal references
let clubModal, editModal;

const auth = getAuth();
const userData = ref(null);

onAuthStateChanged(auth, async (firebase_user) => {
  if (firebase_user) {
    const storedUser = JSON.parse(localStorage.getItem("userData"));

    // Check if the uid is different before fetching new data
    if (!storedUser || storedUser.uid !== firebase_user.uid) {
      const user = await getUser(firebase_user.uid);
      userData.value = user;
      localStorage.setItem("userData", JSON.stringify(user));
    } else {
      // If the same user, directly use storedUser
      userData.value = storedUser;
    }
  } else {
    localStorage.removeItem("userData");
    userData.value = null;
  }
});

// Reactive references
const data = ref({});
const selectedKey = ref("");
const emptyID = ref(randomID());

// Set up the database and filter data
fetchClubDirectory((dataReturned) => {
  data.value = dataReturned; // dataReturned is an object
  refilterDataKeys(SUBJECTS);
});

const filteredDataKeys = ref([]);

function refilterDataKeys(subjectSelections) {
  const result = Object.keys(data.value).filter((key) =>
    subjectSelections.includes(data.value[key].subject)
  );
  filteredDataKeys.value = result;
}


// Editing states
const editing = ref(false);
const newRegister = ref(false);

function showModal(key) {
  selectedKey.value = key;
  newRegister.value = false;
  if (clubModal) clubModal.show();
}

function openEditing() {
  if (clubModal) clubModal.hide();
  if (editModal) editModal.show();
}

function closeEditing() {
  if (editModal) editModal.hide();
}

// Authentication actions
async function signInPath() {
  const userId = await signIn();
  const dbData = await getUser(userId);
  const adminData = await userIsAdmin(userId);
  if (adminData) {
    dbData.is_admin = true;
    dbData.admin_role = adminData.role;
  }
  userData.value = dbData;
  localStorage.setItem("userData", JSON.stringify(dbData));
}

// Registration handler
function resetEmpty() {
  data.value[emptyID.value] = {
    advisor: {},
    description: "",
    image: "",
    leader: {},
    meeting_room: "",
    name: "",
    sign_up: "",
    subject: "",
  };
}

function registerNew() {
  resetEmpty();
  selectedKey.value = emptyID.value;
  newRegister.value = true;
  openEditing();
}

// On page load, load modals and user data
window.addEventListener("load", () => {
  if (localStorage.getItem("userData")) {
    userData.value = JSON.parse(localStorage.getItem("userData"));
  }
  // Initialize Bootstrap modals
  // eslint-disable-next-line
  clubModal = new bootstrap.Modal(document.getElementById("clubModal"));
  // eslint-disable-next-line
  editModal = new bootstrap.Modal(document.getElementById("editModal"));
});
</script>
