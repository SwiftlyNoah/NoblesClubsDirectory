<template>
  <div>
    <TopBar
      :userData="userData"
      @register-new="registerNew"
      @sign-in="signInPath"
    />
    <div class="container-fluid px-4">
      <div v-if="loading" class="text-center my-4">
        <span>Loading data...</span>
      </div>
      <div v-else>
        <div v-if="newClubs.length > 0">
          <h2>New Clubs ({{ newClubs.length }})</h2>
          <div class="horizontal-scroll">
            <div
              class="club-card"
              v-for="club in newClubs"
              :key="club.key"
            >
              <ClubCard :item="club" @click="() => showModal(club.key, 'approve')" />
            </div>
          </div>
        </div>
        <div v-if="editedClubs.length > 0" class="mt-5">
          <h2>Edited Clubs ({{ editedClubs.length }})</h2>
          <div class="horizontal-scroll">
            <div
              class="club-card"
              v-for="club in editedClubs"
              :key="club.key"
            >
              <ClubCard :item="club" @click="() => showModal(club.key, 'approve')" />
            </div>
          </div>
        </div>

        <div v-if="Object.keys(publishedClubs).length != 0" class="mt-5">
          <h2>
            Published Clubs 
            ({{ activePublishedCount }} active, {{ inactivePublishedCount }} inactive)
          </h2>
          <div class="dynamic-grid">
            <div
              v-for="[key, club] in Object.entries(publishedClubs).filter(([key]) => key != emptyID)"
              :key="key"
              class="club-card"
            >
              <ClubCard :item="club" @click="() => showModal(key, 'edit')" />
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div v-if="newClubs.length === 0 && editedClubs.length === 0 && Object.keys(publishedClubs).length === 0" class="text-center">
          <i>No clubs to display.</i>
        </div>
      </div>

      <!-- Club Modal for New/Edited Clubs -->
      <ClubModal
        :selectedItem="unpublishedClubs[selectedKey] || { advisor: {}, leader: {} }"
        :selectedKey="selectedKey"
        :isAdmin="true"
        @approveClub="approveClub"
        @rejectClub="rejectClub"
        @closeEditing="closeClubModal"
      />

      <!-- Edit Modal for Published Clubs -->
      <EditModal
        :selectedItem="publishedClubs[selectedKey] || { advisor: {}, leader: {} }"
        :selectedKey="selectedKey"
        :isNewClub="isNewClub"
        :isAdmin="true"
        @submitClub="submitClub"
        @markActive="markActive"
        @deleteClub="deleteClub"
        @closeEditing="closeEditModal"
      />
    </div>
  </div>
</template>

<script setup>
import { useAuth } from "../composables/useAuth";
import { ref, computed, onMounted } from "vue";
import {
  fetchClubDirectory,
  fetchUnpublishedClubs,
  approveClub as approveClubDb,
  rejectClub as rejectClubDb,
  deleteClub as deleteClubDb,
  setClubActive,
  setClubInactive,
  adminWriteClub,
  randomID,
} from "../db";
import ClubCard from "../components/ClubCard";
import ClubModal from "../components/ClubModal";
import EditModal from "../components/EditModal";
import TopBar from "../components/TopBar.vue";

const { userData } = useAuth();

const loading = ref(true);
const newClubs = ref([]);
const editedClubs = ref([]);
const publishedClubs = ref({});
const unpublishedClubs = ref({});
const selectedKey = ref("");

const isNewClub = ref(false);
const emptyID = ref(randomID());

let clubModal, editModal;

const activePublishedCount = computed(() => {
  return Object.entries(publishedClubs.value).filter(
    ([key, club]) => club.is_active && key !== emptyID.value
  ).length;
});
const inactivePublishedCount = computed(() => {
  return Object.values(publishedClubs.value).filter((club) => !club.is_active).length;
});

onMounted(async () => {
  try {
    const [directory, unpublished] = await Promise.all([
      fetchClubDirectory(true),
      fetchUnpublishedClubs(),
    ]);

    publishedClubs.value = directory || {};
    unpublishedClubs.value = unpublished || {};

    // Sort unpublished clubs into new or edited
    Object.entries(unpublished).forEach(([key, club]) => {
      club.key = key;
      if (key in publishedClubs.value) {
        editedClubs.value.push(club);
      } else {
        newClubs.value.push(club);
      }
    });
  } catch (error) {
    console.error("Error fetching data:", error);

    if (error.message && error.message.includes("Permission denied")) {
      window.location.href = "/home";
    }
  } finally {
    loading.value = false;
  }

  // eslint-disable-next-line
  clubModal = new bootstrap.Modal(document.getElementById("clubModal"));
  // eslint-disable-next-line
  editModal = new bootstrap.Modal(document.getElementById("editModal"));
});


function showModal(key, type) {
  selectedKey.value = key;
  if (type === 'approve') {
    clubModal.show(); 
  } else if (type === 'edit') {
    isNewClub.value = false;
    editModal.show(); 
  }
}

function closeClubModal() {
  clubModal.hide();
  selectedKey.value = "";
}

function closeEditModal() {
  editModal.hide();
  selectedKey.value = "";
}

async function approveClub() {
  const clubEntry = unpublishedClubs.value[selectedKey.value];
  if (!clubEntry) return;

  try {
    await approveClubDb(selectedKey.value, clubEntry);
    delete unpublishedClubs.value[selectedKey.value];
    newClubs.value = newClubs.value.filter((club) => club.key !== selectedKey.value);
    editedClubs.value = editedClubs.value.filter((club) => club.key !== selectedKey.value);
    closeClubModal();
  } catch (error) {
    console.error("Error approving club:", error);
  }
}

async function rejectClub() {
  const clubEntry = unpublishedClubs.value[selectedKey.value];
  if (!clubEntry) return;

  try {
    await rejectClubDb(selectedKey.value, clubEntry);
    delete unpublishedClubs.value[selectedKey.value];
    newClubs.value = newClubs.value.filter((club) => club.key !== selectedKey.value);
    editedClubs.value = editedClubs.value.filter((club) => club.key !== selectedKey.value);
    closeClubModal();
  } catch (error) {
    console.error("Error rejecting club:", error);
  }
}

async function deleteClub(key, entry) {
  try {
    await deleteClubDb(key, entry);
    delete publishedClubs.value[key];
    closeEditModal();
  } catch (error) {
    console.error("Error deleting club:", error);
  }
}

async function markActive(newValue, key, entry) {
  try {
    if (newValue) {
      await setClubActive(key, entry);
    } else {
      await setClubInactive(key, entry);
    }
    publishedClubs.value[key].is_active = newValue;
    closeEditModal();
  } catch (error) {
    console.error("Error updating club active status:", error);
  }
}

async function submitClub(key, entry) {
  try {
    await adminWriteClub(key, entry);
    publishedClubs.value[key] = entry;
    closeEditModal();
    if (isNewClub.value) {
      emptyID.value = randomID();
    }
  } catch (error) {
    console.error("Error submitting club:", error);
  }
}

// Registration handler
function resetEmpty() {
  publishedClubs.value[emptyID.value] = {
    advisor: {},
    description: "",
    image: "",
    leader: {},
    meeting_room: "",
    name: "",
    sign_up: "",
    subject: "",
    is_active: true
  };
}

function registerNew() {
  resetEmpty();
  selectedKey.value = emptyID.value;
  isNewClub.value = true;
  editModal.show()
}

</script>

<style scoped>
.container-fluid {
  margin-top: 20px;
}

h2 {
  margin-bottom: 20px;
  font-size: 1.5rem;
}

/* Horizontal scrolling container for New and Edited Clubs */
.horizontal-scroll {
  display: flex;
  overflow-x: auto; /* Enable horizontal scrolling */
  gap: 1rem; /* Space between cards */
  padding-bottom: 1rem;
  scrollbar-width: thin; /* Customize scrollbar for Firefox */
}

.horizontal-scroll::-webkit-scrollbar {
  height: 8px; /* Customize scrollbar height for Webkit browsers */
}

.horizontal-scroll::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.horizontal-scroll::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Dynamic grid for Published Clubs */
.dynamic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 250px); /* Automatically fill with 250px columns */
  gap: 1rem; /* Space between cards */
  justify-content: center; /* Center the grid in the container */
}

/* Fixed card width for consistent appearance */
.club-card {
  width: 250px;
}
</style>
