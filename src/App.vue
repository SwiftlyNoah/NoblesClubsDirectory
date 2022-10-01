<template>
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
          <p class="results-count">{{ filteredDataKeys.length }} results</p>
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
    <ClubModal v-if="! editing" :selectedItem="data[selectedKey] || {advisor:{},leader:{}}" />
    <EditModal v-if="editing" :selectedItem="data[selectedKey] || {advisor:{},leader:{}}" :selectedKey="selectedKey" :openCount="openCount" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { setupDB } from './db';
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
setupDB(dataReturned => {
  const val = dataReturned;
  val["c"] = val["a"];
  val["d"] = val["a"];
  val["e"] = val["b"];
  val["f"] = val["b"];
  data.value = val;
  dataKeys.value = shuffle(Object.keys(val));
  selectedKey.value = "a";
  refilterDataKeys([0,1,2,3,4]);
});

const filteredDataKeys = ref([]);
function refilterDataKeys(daySelections) {
  const result = [];
  for ( const key of dataKeys.value ) {
    if ( daySelections.indexOf(data.value[key].meeting_time.day) > -1 ) result.push(key);
  }
  filteredDataKeys.value = result;
}

const editing = ref(true);
const openCount = ref(0);
let modal;
window.onload = () => {
  // eslint-disable-next-line
  modal = new bootstrap.Modal(document.getElementById("clubModal"));
};
function showModal(key) {
  selectedKey.value = key;
  openCount.value++;
  modal.show();
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
