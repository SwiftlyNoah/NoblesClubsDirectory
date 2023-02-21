<template>
  <div class="collapse" id="collapseExample">
    <div class="card card-body">
      <div class="row">
        <div class="col-md-3">
          <b>Meeting days</b>
        </div>
        <div class="col-md-9">
          <p>
            <nobr v-for="(item,index) in DAYS_OF_WEEK" :key="item">
              <input class="form-check-input" type="checkbox" checked :value="index" v-model="daySelections" />
              <label class="form-check-label">{{ item }}</label>
            </nobr>
            <br />
            <button class="btn btn-primary" @click="daySelections = [0,1,2,3,4]">Select all</button>
            <button class="btn btn-primary" @click="daySelections = []">Deselect all</button>
          </p>
        </div>
      </div>
      <hr />
      <div class="row">
        <div class="col-md-3">
          <b>Subjects</b>
        </div>
        <div class="col-md-9">
          <p>
            <nobr v-for="item in SUBJECTS" :key="item">
              <input class="form-check-input" type="checkbox" checked :value="item" v-model="subjectSelections" />
              <label class="form-check-label">{{ item }}</label>
            </nobr>
            <br />
            <button class="btn btn-primary" @click="subjectSelections = SUBJECTS">Select all</button>
            <button class="btn btn-primary" @click="subjectSelections = []">Deselect all</button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineEmits,ref,watch } from 'vue';
import { DAYS_OF_WEEK,SUBJECTS } from '../constants';

const emit = defineEmits(["updateFilters"]);

const daySelections = ref([0,1,2,3,4]);
const subjectSelections = ref(SUBJECTS);
watch(() => daySelections.value,value => {
  emit("updateFilters",value,subjectSelections.value);
});
watch(() => subjectSelections.value,value => {
  emit("updateFilters",daySelections.value,value);
})
</script>

<style scoped>
  .card {
    padding-bottom: 0;
  }
  .form-check-label {
    margin-left: .25rem;
    margin-right: .75rem;
  }
  .btn {
    margin-top: .5rem;
    margin-right: .5rem;
  }
  hr {
    margin-top: 0;
  }
</style>