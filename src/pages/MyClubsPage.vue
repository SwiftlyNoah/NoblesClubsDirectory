<template>
  <div>
    <TopBar :userData="userData" @register-new="registerNew" />

    <div class="container-fluid px-4">
      <div>
        <div v-if="Object.entries(data).filter(([_, club]) => club.is_published).length > 0">
          <h2 class="section-header">Published Clubs</h2>
          <div class="dynamic-grid">
            <div
              v-for="[key, club] in Object.entries(data).filter(([_, club]) => club.is_published)"
              :key="key"
              class="club-card"
            >
              <ClubCard :item="club" @click="() => showModal(key)" />
            </div>
          </div>
        </div>

        <div v-if="Object.entries(data).filter(([_, club]) => !club.is_published && key !== emptyID).length > 0">
          <h2 class="section-header">Unpublished Clubs</h2>
          <div class="dynamic-grid">
            <div
              v-for="[key, club] in Object.entries(data).filter(([_, club]) => !club.is_published && key !== emptyID)"
              :key="key"
              class="club-card"
            >
              <ClubCard :item="club" @click="() => showModal(key)" />
            </div>
          </div>
        </div>
      </div>

      <!-- Club Modal for Viewing -->
      <ClubModal
        v-show="!editing"
        :selectedItem="data[selectedKey] || { advisor: {}, leader: {} }"
        :isLeader="true"
        :isAdmin="false"
        @openEditing="openEditing"
      />

      <!-- Edit Modal for Editing -->
      <EditModal
        v-show="editing"
        :selectedItem="data[selectedKey] || { advisor: {}, leader: {} }"
        :selectedKey="selectedKey"
        :isNewClub="isNewClub"
        @submitClub="submitClubForApproval"
      />
    </div>
  </div>
</template>

<script setup>
import { useAuth } from "../composables/useAuth";
import { ref, onMounted, watch } from "vue";
import ClubCard from "../components/ClubCard";
import ClubModal from "../components/ClubModal";
import EditModal from "../components/EditModal";
import TopBar from "../components/TopBar.vue";
import { fetchClubDirectory, fetchMyClubs, fetchUnpublishedClubs, randomID, submitClub } from "../db";

const { userData } = useAuth();

// Modal references
let clubModal, editModal;

// Reactive references
const data = ref({});
const selectedKey = ref("");

// For new clubs
const editing = ref(false);
const emptyID = ref(randomID());
const isNewClub = ref(false);

function showModal(key) {
  selectedKey.value = key;
  isNewClub.value = false;
  if (clubModal) clubModal.show();
}

function openEditing() {
  if (clubModal) clubModal.hide();
  if (editModal) editModal.show();
}

function closeEditing() {
  if (editModal) editModal.hide();
}

function submitClubForApproval(key, entry) {
  submitClub(key, entry);
  closeEditing();
  if (isNewClub.value) {
    emptyID.value = randomID();
  }
}

// Registration handler
function resetEmpty() {
  data.value[emptyID.value] = {
    advisor: {},
    description: "",
    image: "",
    leader: {},
    meeting_room: "",
    name: "",
    sign_up: "",
    subject: "",
    is_active: true,
    is_published: false,
  };
}

function registerNew() {
  resetEmpty();
  selectedKey.value = emptyID.value;
  isNewClub.value = true;
  openEditing();
}

async function fetchData(uid) {
  try {
    const [publishedClubsData, unpublishedClubsData, myClubsData] = await Promise.all([
      fetchClubDirectory(true),
      fetchUnpublishedClubs(),
      fetchMyClubs(uid),
    ]);

    const publishedClubs = publishedClubsData || {};
    const unpublishedClubs = unpublishedClubsData || {};
    const myClubs = myClubsData || {};

    Object.entries(myClubs).forEach(([key]) => {
      if (key in publishedClubs) {
        data.value[key] = { ...publishedClubs[key], is_published: true };
      } else if (key in unpublishedClubs) {
        data.value[key] = { ...unpublishedClubs[key], is_published: false };
      }
    });

    // eslint-disable-next-line
    clubModal = new bootstrap.Modal(document.getElementById("clubModal"));
    // eslint-disable-next-line
    editModal = new bootstrap.Modal(document.getElementById("editModal"));
  } catch (error) {
    console.error("Error fetching data:", error);
    if (error.message.includes("Permission denied")) {
      window.location.href = "/home";
    }
  }
}

onMounted(() => {
  watch(
    () => userData.value,
    (newUserData) => {
      fetchData(newUserData.uid);
    },
    { immediate: true }
  );
});
</script>

<style scoped>
.container-fluid {
  margin-top: 20px;
}
h2 {
  margin-bottom: 20px;
  font-size: 1.5rem;
}

/* Dynamic grid layout */
.dynamic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 250px); /* Automatically fill with 250px columns */
  gap: 1rem;
}

/* Fixed card dimensions */
.club-card {
  width: 250px;
}
</style>
