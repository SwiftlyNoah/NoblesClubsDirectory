<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">Nobles</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse justify-content-end" id="navbarSupportedContent">
        <ul class="navbar-nav">
          <li v-if="! userData" class="nav-item">
            <button class="btn btn-outline-success" @click="signInPath">Sign In</button>
          </li>
          <li v-if="userData" class="nav-item btn-group dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              Welcome, {{ userData.first_name }}
            </a>
            <ul class="dropdown-menu dropdown-menu-right" aria-labelledby="navbarDropdown">
              <li><a class="dropdown-item" @click="registerNew">Register a club/org</a></li>
              <li><a class="dropdown-item" @click="signOut">Sign out</a></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
  <div class="video-container">
    <video autoplay muted loop>
      <source src="@/assets/bgvid.mp4" type="video/mp4" />
    </video>
    <div class="video-filter">
      <div class="container d-flex align-items-center">
        <p class="title">Nobles Clubs and Organizations</p>
      </div>
    </div>
  </div>
  <div class="container">
    <div class="filters">
      <div class="row filters-menu">
        <div class="col-6">
          <p class="results-count">{{ filteredDataKeys.length }} result{{ filteredDataKeys.length != 1 ? "s" : "" }}</p>
        </div>
        <div class="col-6 text-end">
          <button class="btn btn-outline-success" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExample" aria-expanded="false" aria-controls="collapseExample">
            <i class="fa-solid fa-filter" />
            Filters
          </button>
        </div>
      </div>
      <FilterBoxes @updateFilters="refilterDataKeys" />
    </div>
    <hr />
    <div class="row">
      <div class="col-md-4">
        <template v-for="key in filteredDataKeys.slice(0,filteredDataKeys.length / 3)" :key="key">
          <ClubCard :item="data[key]" @click="() => showModal(key)" />
        </template>
      </div>
      <div class="col-md-4">
        <template v-for="key in filteredDataKeys.slice(filteredDataKeys.length / 3,2 * filteredDataKeys.length / 3)" :key="key">
          <ClubCard :item="data[key]" @click="() => showModal(key)" />
        </template>
      </div>
      <div class="col-md-4">
        <template v-for="key in filteredDataKeys.slice(2 * filteredDataKeys.length / 3)" :key="key">
          <ClubCard :item="data[key]" @click="() => showModal(key)" />
        </template>
      </div>
    </div>
    <ClubModal v-show="! editing" :selectedItem="data[selectedKey] || {advisor:{},leader:{},meeting_time:{}}" :userData="userData" @openEditing="openEditing" />
    <EditModal v-show="editing" :selectedItem="data[selectedKey] || {advisor:{},leader:{},meeting_time:{}}" :selectedKey="selectedKey" :newRegister="newRegister" @closeEditing="closeEditing" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { setupDB,signIn,randomHexID } from './db';
import ClubCard from './components/ClubCard';
import ClubModal from './components/ClubModal';
import EditModal from './components/EditModal';
import FilterBoxes from './components/FilterBoxes';

function shuffle(array) {
  let currentIndex = array.length;
  let randomIndex;
  while ( currentIndex != 0 ) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex],array[randomIndex]] = [array[randomIndex],array[currentIndex]];
  }
  return array;
}

const data = ref({});
const dataKeys = ref([]);
const selectedKey = ref("");
const hasShuffled = ref(false);
const emptyID = ref(null);
setupDB(dataReturned => {
  const val = dataReturned;
  const emptyIDVar = randomHexID();
  emptyID.value = emptyIDVar;
  val[emptyIDVar] = {
    "advisor": {
      "email": "",
      "name": ""
    },
    "description": "",
    "image": "",
    "leader": {
      "email": "",
      "name": ""
    },
    "meeting_time": {
      "day": 4,
      "hour": 14,
      "minute": 25
    },
    "name": "",
    "sign_up": ""
  };
  data.value = val;
  const keysReturned = Object.keys(val).filter(item => item != emptyIDVar);
  if ( ! hasShuffled.value ) {
    dataKeys.value = shuffle(keysReturned);
    hasShuffled.value = true;
  } else if ( keysReturned.length != dataKeys.value.length ) {
    const additions = keysReturned.filter(item => dataKeys.value.indexOf(item) == -1);
    dataKeys.value = dataKeys.value.concat(additions);
  }
  refilterDataKeys([0,1,2,3,4],["Computer Science","Math"]);
});

const filteredDataKeys = ref([]);
function refilterDataKeys(daySelections,subjectSelections) {
  const result = [];
  for ( const key of dataKeys.value ) {
    if (
      daySelections.indexOf(data.value[key].meeting_time.day) > -1 &&
      subjectSelections.indexOf(data.value[key].subject) > -1
    ) result.push(key);
  }
  filteredDataKeys.value = result;
}

const editing = ref(false);
let clubModal,editModal;
window.addEventListener("load",() => {
  // eslint-disable-next-line
  clubModal = new bootstrap.Modal(document.getElementById("clubModal"));
  // eslint-disable-next-line
  editModal = new bootstrap.Modal(document.getElementById("editModal"));
});
const newRegister = ref(false);
function showModal(key) {
  selectedKey.value = key;
  newRegister.value = false;
  clubModal.show();
}
function openEditing() {
  clubModal.hide();
  editModal.show();
}
function closeEditing() {
  editModal.hide();
  clubModal.show();
}

const userData = ref(null);
async function signInPath() {
  const data = await signIn();
  userData.value = data;
  localStorage.setItem("userData",JSON.stringify(data));
}
function signOut() {
  localStorage.removeItem("userData");
  location.reload();
}
window.addEventListener("load",() => {
  if ( localStorage.getItem("userData") ) userData.value = JSON.parse(localStorage.getItem("userData"));
});

function registerNew() {
  selectedKey.value = emptyID.value;
  newRegister.value = true;
  openEditing();
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
}
.container {
  max-width: 1000px;
}
.fa-solid {
  padding-right: 0.25rem;
}
.dropdown-menu {
  margin-left: -1rem;
}
.filters {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.filters-menu {
  margin-bottom: 1rem;
}
.results-count {
  margin-top: .5rem;
  margin-bottom: 0;
  font-style: italic;
}
video {
  width: 100vw;
  margin-top: min(calc((60vh - 100vw * (9/16)) / 2),0px);
}
.video-container {
  position: relative;
  max-height: 60vh;
  overflow: hidden;
}
.video-filter {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: min(60vh,calc(100vw * (9/16)));
  background-color: rgba(0,0,0,.5);
}
.video-filter .container {
  height: 100%;
  vertical-align: middle;
}
.video-filter span {
  vertical-align: middle;
}
.title {
  color: white;
  font-size: 3rem;
  text-transform: uppercase;
  font-weight: bold;
  border-bottom: 5px solid red;
}
</style>
