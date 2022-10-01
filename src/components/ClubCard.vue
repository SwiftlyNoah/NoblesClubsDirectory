<template>
  <div class="card">
    <img :src="item.image" class="card-img-top">
    <div class="card-body">
      <h5 class="card-title">{{ item.name }}</h5>
      <div class="card-text">
        <p class="description">{{ item.description }}</p>
        <p>
          <i class="fa-solid fa-clock"></i>
          <i>{{ formatMeetingTime(item.meeting_time) }}</i>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { formatMeetingTime } from '../timeFormat';

defineProps(["item"]);
</script>

<style scoped>
.card {
  cursor: pointer;
  margin-bottom: 1rem;
}
.description {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-text *:last-child {
  margin-bottom: 0;
}
</style>