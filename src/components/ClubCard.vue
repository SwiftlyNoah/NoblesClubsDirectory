<template>
 <div class="card h-100">
    <div class="card-img-wrapper">
      <img
        :src="imageURL"
        class="card-img-top"
        :alt="item.name"
      >
    </div>
    <div class="card-body">
      <h5 class="card-title" ref="titleRef">{{ item.name }}</h5>
      <p 
        class="description" 
        :style="{ '-webkit-line-clamp': descriptionClamp }"
      >
        {{ item.description }}
      </p>
    </div>
 </div>
</template>

<script setup>
import { defineProps, ref, onMounted, watch } from 'vue';
import { getImageURL } from '../db';

const props = defineProps(["item"]);
const imageURL = ref("");
const titleRef = ref(null);
const descriptionClamp = ref(4); // Default line clamp value

const calculateClamp = () => {
  if (titleRef.value) {
    const titleLineHeight = parseFloat(getComputedStyle(titleRef.value).lineHeight) || 1.3;
    const titleHeight = titleRef.value.offsetHeight;
    const titleLines = Math.round(titleHeight / titleLineHeight);
    descriptionClamp.value = Math.max(0, 6 - titleLines); // Ensure line clamp is not negative
  }
};

// Fetch the image URL and update the clamp after the component is mounted
(async () => {
  imageURL.value = await getImageURL(props.item.image);
})();

onMounted(() => {
  calculateClamp();
  watch(() => props.item.name, calculateClamp); // Recalculate if the title changes
});
</script>

<style scoped>
.card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}
.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.card-img-wrapper {
  aspect-ratio: 3 / 2; /* Use CSS aspect-ratio for simplicity */
  overflow: hidden;
}
.card-img-top {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Ensures consistent image scaling */
}
.card-title {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}
.description {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #666;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}
</style>
