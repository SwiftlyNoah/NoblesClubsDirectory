<template>
  <div class="modal fade" id="clubModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-body">
          <img :src="imageURL" />
          <h5>{{ selectedItem.name }}</h5>
          <p>
            <span>Meeting time:</span>
            <i class="fa-solid fa-clock" />
            <span>{{ formatMeetingTime(selectedItem.meeting_time) }}</span>
          </p>
          <p>
            <span>Meeting room:</span>
            <i class="fa-solid fa-clock" />
            <span>{{ selectedItem.meeting_room }}</span>
          </p>
          <p>
            <span>Student leader:</span>
            <i class="fa-solid fa-envelope" />
            <template v-for="(leader,key,index) of selectedItem.leader" :key="leader">
              <a :href="`mailto:${leader.email}`">{{ leader.name }}</a>
              <template v-if="index < Object.keys(selectedItem.leader).length - 1">, </template>
            </template>
          </p>
          <p>
            <span>Faculty advisor:</span>
            <i class="fa-solid fa-envelope" />
            <a :href="`mailto:${selectedItem.advisor.email}`">{{ selectedItem.advisor.name }}</a>
          </p>
          <p>
            Main subject: {{ selectedItem.subject }}
          </p>
          <p>
            How to sign up: {{ selectedItem.sign_up }}
          </p>
          <p class="description">Mission statement: {{ selectedItem.description }}</p>
          <button v-if="canEdit" class="btn btn-outline-primary" @click="$emit('openEditing')">Edit listing</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps,ref,watch,computed } from 'vue';
import { getImageURL } from '../db';
import { formatMeetingTime } from '../timeFormat';

const props = defineProps(["selectedItem","userData"]);

const imageURL = ref("");
watch(() => props.selectedItem,async () => {
  if ( props.selectedItem.image ) imageURL.value = await getImageURL(props.selectedItem.image);
});

const canEdit = computed(() => {
  if ( ! props.userData ) return false;
  for ( const leader of Object.values(props.selectedItem.leader) ) {
    if ( leader.email == props.userData.email ) return true;
  }
  return props.selectedItem.advisor.email == props.userData.email;
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
.btn {
  margin-top: .5rem;
}
</style>