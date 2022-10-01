<template>
  <div class="modal fade" id="clubModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-body">
          <img :src="selectedItem.image" />
          <h5>{{ selectedItem.name }}</h5>
          <p>
            <span>Meeting time:</span>
            <i class="fa-solid fa-clock" />
            <span>{{ formatMeetingTime(selectedItem.meeting_time) }}</span>
          </p>
          <p>
            <span>Student leader:</span>
            <i class="fa-solid fa-envelope" />
            <a :href="`mailto:${selectedItem.leader.email}`">{{ selectedItem.leader.name }}</a>
          </p>
          <p>
            <span>Faculty advisor:</span>
            <i class="fa-solid fa-envelope" />
            <a :href="`mailto:${selectedItem.advisor.email}`">{{ selectedItem.advisor.name }}</a>
          </p>
          <p>
            How to sign up: {{ selectedItem.sign_up }}
          </p>
          <p class="description">Mission statement: {{ selectedItem.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { formatMeetingTime } from '../timeFormat';

defineProps(["selectedItem"]);
</script>

<style scoped>
.modal-dialog {
  max-width: 800px;
}
.modal-top {
  text-align: center;
}
.fa-solid {
  padding-left: .25rem;
}
h5 {
  padding-bottom: .5rem;
}
img {
  width: 50%;
  float: right;
  margin-bottom: 1rem;
  border-radius: 5px;
}
.description {
  margin-bottom: .25rem;
}
</style>