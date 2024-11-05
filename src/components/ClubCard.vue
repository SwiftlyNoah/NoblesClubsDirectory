<template>
  <div class="card">
    <img :src="imageURL" class="card-img-top">
    <div class="card-body">
      <h5 class="card-title">{{ item.name }}</h5>
      <div class="card-text">
        <p class="description">{{ item.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps,ref } from 'vue';
import { getImageURL } from '../db';

const props = defineProps(["item"]);

const imageURL = ref("");
(async () => {
  imageURL.value = await getImageURL(props.item.image);
})();
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
  .card-img-top {
    text-indent: -10000px;
  }
</style>