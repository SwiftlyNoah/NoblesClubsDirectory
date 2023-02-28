<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">
        <img src="@/assets/logo_white.png" />
        Clubs &amp; Organizations Directory
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse justify-content-end" id="navbarSupportedContent">
        <ul class="navbar-nav">
          <li v-if="! userData" class="nav-item">
            <button class="btn btn-light" @click="signInPath">Sign In</button>
          </li>
          <template v-if="userData">
            <li class="nav-item welcome">
              <a class="nav-link ">
                Welcome, {{ userData.first_name }}
              </a>
            </li>
            <li class="nav-item">
              <button class="btn btn-light" @click="registerNew">Register a Club/Org</button>
            </li>
            <li class="nav-item">
              <button class="btn btn-light" @click="signOut">Sign Out</button>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
  <div class="video-container">
    <video autoplay muted loop playsinline>
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
          <button class="btn btn-success" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExample" aria-expanded="false" aria-controls="collapseExample">
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
        <template v-for="key in filteredDataKeys.slice(0,Math.ceil(filteredDataKeys.length / 3))" :key="key">
          <ClubCard :item="data[key]" @click="() => showModal(key)" />
        </template>
      </div>
      <div class="col-md-4">
        <template v-for="key in filteredDataKeys.slice(Math.ceil(filteredDataKeys.length / 3),Math.ceil(2 * filteredDataKeys.length / 3))" :key="key">
          <ClubCard :item="data[key]" @click="() => showModal(key)" />
        </template>
      </div>
      <div class="col-md-4">
        <template v-for="key in filteredDataKeys.slice(Math.ceil(2 * filteredDataKeys.length / 3))" :key="key">
          <ClubCard :item="data[key]" @click="() => showModal(key)" />
        </template>
      </div>
    </div>
    <i v-if="filteredDataKeys.length == 0" class="no-results">No results!</i>
    <hr />
    <div class="footer">
      <img src="@/assets/logo.png" />
      <p>
        <b>Noble and Greenough School Club Directory</b><br />
        Contact <a href="mailto:codingclubleaders@nobles.edu">codingclubleaders@nobles.edu</a> with questions
      </p>
    </div>
    <ClubModal v-show="! editing" :selectedItem="data[selectedKey] || {advisor:{},leader:{},meeting_time:{}}" :userData="userData" @openEditing="openEditing" />
    <EditModal v-show="editing" :selectedItem="data[selectedKey] || {advisor:{},leader:{},meeting_time:{}}" :selectedKey="selectedKey" :newRegister="newRegister" @closeEditing="closeEditing" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { setupDB,signIn,randomHexID } from './db';
import { SUBJECTS } from './constants';
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
  data.value = dataReturned;
  const emptyIDVar = randomHexID();
  emptyID.value = emptyIDVar;  
  const keysReturned = Object.keys(dataReturned).filter(item => item != emptyIDVar);
  if ( ! hasShuffled.value ) {
    dataKeys.value = shuffle(keysReturned);
    hasShuffled.value = true;
  } else if ( keysReturned.length != dataKeys.value.length ) {
    const additions = keysReturned.filter(item => dataKeys.value.indexOf(item) == -1);
    dataKeys.value = dataKeys.value.concat(additions);
  }
  refilterDataKeys([0,1,2,3,4],SUBJECTS);
});

const filteredDataKeys = ref([]);
function refilterDataKeys(daySelections,subjectSelections) {
  const result = [];
  for ( const key of dataKeys.value ) {
    if (
      daySelections.indexOf(data.value[key].meeting_time.day) > -1 &&
      subjectSelections.indexOf(data.value[key].subject) > -1 && data.value[key].name != "Robotics Club"
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
  console.log(selectedKey,data.value[selectedKey.value])
  clubModal.hide();
  editModal.show();
}

function closeEditing(openClubModal) {
  editModal.hide();
  if ( openClubModal ) clubModal.show();
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

function resetEmpty() {
  data.value[emptyID.value] = {
    "advisor": {
      "email": "",
      "name": ""
    },
    "description": "",
    "image": "",
    "leader": {},
    "meeting_room": "",
    "meeting_time": {
      "day": 4,
      "hour": 14,
      "minute": 25
    },
    "name": "",
    "sign_up": "",
    "subject": ""
  };
  data.value[emptyID.value].leader[randomHexID()] = {
    "email": "",
    "name": ""
  }
}

function registerNew() {
  resetEmpty();
  selectedKey.value = emptyID.value;
  newRegister.value = true;
  console.log(data.value[selectedKey.value])
  openEditing();
}
</script>

<style>
  body {
    overflow-x: none;
  }
  #app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
  }
  .navbar {
    background-color: #D11D27 !important;
  }
  .navbar-brand,.nav-item a {
    color: white !important;
  }
  .navbar-brand img {
    width: 60px;
    margin-right: 0.5rem;
  }
  @media (min-width: 992px) {
    .nav-item:last-child {
      margin-left: 0.5rem;
    }
  }
  @media (max-width: 991px) {
    .nav-item:first-child a {
      padding-top: 0;
    }
    .nav-item:last-child {
      margin-top: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .nav-item {
      text-align: right;
    }
  }
  .welcome {
      margin-right: .25rem;
    }
  .navbar-toggler {
    border-color: rgba(255,255,255,0.75) !important;
  }
  .navbar-toggler:focus {
    box-shadow: 0 0 0 0.25rem rgb(255,255,255,0.55);
  }
  .navbar-toggler-icon {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 1%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e") !important;
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
  @media (max-width: 503px) {
    .title {
      font-size: 2rem;
    }
  }
  .footer {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding-bottom: 1rem;
  }
  .footer img {
    display: block;
    width: 150px;
  }
  .footer p {
    font-size: 1rem;
    margin-left: 2rem;
  }
  .no-results {
    display: block;
    text-align: center;
  }
</style>
