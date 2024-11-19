<template>
  <div class="modal fade" id="clubModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-body">
          <img :src="imageURL" />
          <h5>{{ selectedItem.name }}</h5>
          <p v-if="(selectedItem.meeting_room || '').trim()">
            <span>Meeting room:</span>
            <i class="fa-solid fa-clock" />
            <span>{{ selectedItem.meeting_room }}</span>
          </p>
          <p v-if="selectedItem.leader && Object.keys(selectedItem.leader).length > 0">
            <span>
              Student leader{{ Object.keys(selectedItem.leader).length != 1 ? "s" : "" }}:
            </span>
            <i class="fa-solid fa-envelope" />
            <template v-for="(leader, key, index) of selectedItem.leader" :key="leader">
              <a :href="`mailto:${leader.email}`">{{ leader.name }}</a>
              <template v-if="index < Object.keys(selectedItem.leader).length - 1">, </template>
            </template>
          </p>
          <p v-if="selectedItem.advisor && Object.keys(selectedItem.advisor).length > 0">
            <span>
              Faculty advisor{{ Object.keys(selectedItem.advisor).length != 1 ? "s" : "" }}:
            </span>
            <i class="fa-solid fa-envelope" />
            <template v-for="(advisor, key, index) of selectedItem.advisor" :key="advisor">
              <a :href="`mailto:${advisor.email}`">{{ advisor.name }}</a>
              <template v-if="index < Object.keys(selectedItem.advisor).length - 1">, </template>
            </template>
          </p>
          <p>
            Main subject: {{ selectedItem.subject }}
          </p>
          <p>
            How to sign up: {{ selectedItem.sign_up }}
          </p>
          <p class="description" v-if="selectedItem.description">Mission statement: {{ selectedItem.description }}</p>
          <div class="button-group">
            <button v-if="isLeader" class="btn btn-primary" @click="$emit('openEditing')">Edit listing</button>
            <div v-if="isAdmin" class="admin-buttons">
              <button class="btn btn-success me-2" @click="$emit('approveClub')">Approve</button>
              <button class="btn btn-danger" @click="$emit('rejectClub')">Reject</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { defineProps,ref,watch } from 'vue';
import { getImageURL } from '../db';

const props = defineProps(["selectedItem", "isLeader", "isAdmin"]);

const imageURL = ref("");
watch(() => props.selectedItem,async () => {
  if ( props.selectedItem.image ) imageURL.value = await getImageURL(props.selectedItem.image);
});
</script>

<style scoped>
.modal-dialog {
  max-width: 800px;
}
.modal-top {
  text-align: center;
}
.fa-solid {
  padding-left: 0.25rem;
}
h5 {
  padding-bottom: 0.5rem;
}
img {
  width: 50%;
  float: right;
  margin-bottom: 1rem;
  border-radius: 5px;
}
.description {
  margin-bottom: 0.25rem;
}
.btn {
  margin-top: 0.5rem;
}
.admin-buttons {
  display: flex;
  justify-content: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
