<template>
  <!-- eslint-disable vue/no-unused-vars -->
  <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-body">
          <div v-if="newRegister">
            <h5>Registering a new club/organization</h5>
            <p>
              Please only fill out this form when:
              <ul>
                <li>you are sure that you want to form a new club/organization and</li>
                <li>you have already booked assembly time to announce it.</li>
              </ul>
            </p>
            <hr />
          </div>
          <div class="image-box">
            <input type="file" name="file" ref="fileButton" class="d-none" @change="triggerImageUpload" />
            <img v-if="imageURL" :src="imageURL" />
            <button class="btn file-upload" @click="fileButton.click()">
              {{ imageURL == "" ? "Add club banner" : "Replace image" }}
            </button>
          </div>
          <input type="text" class="h5-input" placeholder="Club/org name" v-model="editableItem.name" />
          <div>
            <input type="text" placeholder="Meeting room" v-model="editableItem.meeting_room" />
          </div>
          <div class="people-section">
            <p>Student leader(s):</p>
            <div v-for="(leader, key) in editableItem.leader" :key="key" class="people-box">
              <p><strong>{{ leader.name }}</strong> - {{ leader.role }}</p>
              <span class="remove-button" @click="() => removePerson(key)">Remove</span>
            </div>
          </div>
          <div class="new-people-box">
            <div class="people-inputs">
              <input type="email" placeholder="Email" v-model="newLeader.email" />
              <input type="text" placeholder="Role" v-model="newLeader.role" />
            </div>
            <button class="btn btn-success add-button" @click="addPerson('leader')">Add</button>
        </div>
          <p v-if="leaderError" class="error-message">{{ leaderError }}</p>
          <div class="people-section">
            <p>Faculty advisor(s):</p>
            <div v-for="(advisor, key) in editableItem.advisor" :key="key" class="people-box">
              <p><strong>{{ advisor.name }}</strong></p>
              <span class="remove-button" @click="() => removePerson(key)">Remove</span>
            </div>
          </div>
          <div class="new-people-box">
            <div class="people-inputs">
              <input type="email" placeholder="Email" v-model="newAdvisor" />
            </div>
            <button class="btn btn-success add-button" @click="addPerson('advisor')">Add</button>
          </div>
          <p v-if="advisorError" class="error-message">{{ advisorError }}</p>
          <div>
            <p>Main subject:</p>
            <select class="form-select days" v-model="editableItem.subject">
              <option v-for="subject in SUBJECTS" :key="subject" :value="subject">{{ subject }}</option>
            </select>
          </div>
          <div>
            <p>How to sign up:</p>
            <input type="text" placeholder="Sign-up info" v-model="editableItem.sign_up" />
          </div>
          <div>
            <p>Mission statement:</p>
            <textarea rows="5" v-model="editableItem.description"></textarea>
          </div>
          <button class="btn btn-success" @click="saveChanges()">{{ newRegister ? "Submit new club for approval" : "Submit edits for approval" }}</button>
          <button class="btn btn-secondary" @click="$emit('closeEditing')">{{ newRegister ? "Exit without publishing" : "Exit without saving" }}</button>
          <p>{{ areErrors ? "You have not completed all above fields." : "" }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch } from "vue";
import { SUBJECTS } from "../constants";
import { submitClub, getImageURL, uploadImage, findUserWithEmail } from "../db";

const props = defineProps(["selectedItem", "selectedKey", "newRegister"]);
const emit = defineEmits(["closeEditing"]);

const editableItem = ref({ advisor: {}, leader: {} });
const imageURL = ref("");
const newLeader = ref({ email: "", role: "" });
const newAdvisor = ref("");

watch(
  () => editableItem.value,
  async () => {
    if (editableItem.value.image)
      imageURL.value = await getImageURL(editableItem.value.image);
    else imageURL.value = "";
    areErrors.value = false;
  }
);

watch(
  () => props.selectedItem,
  () => {
    editableItem.value = props.selectedItem;
  }
);

const leaderError = ref("");
const advisorError = ref("");

async function addPerson(type) {
  const isStudentLeader = type === "leader";
  const person = isStudentLeader ? newLeader.value.email : newAdvisor.value;
  const user = await findUserWithEmail(person);

  if (user) {
    const confirmedUser = {
      email: user.email,
      name: `${user.first} ${user.last}`,
      id: user.id,
      ...(isStudentLeader ? { role: newLeader.value.role } : {}),
    };

    if (isStudentLeader) {
      if (user.person_type != "student") {
        leaderError.value = `${newLeader.value.email} is not a student`;
        return;
      }
      editableItem.value.leader[user.uid] = confirmedUser;
      newLeader.value.email = "";
      newLeader.value.role = "";
      leaderError.value = ""; // Reset error if addition is successful
    } else {
      if (user.person_type == "student") {
        leaderError.value = `${newLeader.value.email} is not a student`;
        return;
      }
      editableItem.value.advisor[user.uid] = confirmedUser;
      newAdvisor.value = "";
      advisorError.value = ""; // Reset error if addition is successful
    }
  } else {
    // Set error message if no user is found
    if (isStudentLeader) {
      leaderError.value = `No user found with email: ${newLeader.value.email}`;
    } else {
      advisorError.value = `No user found with email: ${newAdvisor.value}`;
    }
  }
}

function removePerson(key) {
  delete editableItem.value.leader[key];
  delete editableItem.value.advisor[key];
}

const fileButton = ref();
async function triggerImageUpload() {
  editableItem.value.image = await uploadImage(fileButton.value.files[0]);
  imageURL.value = await getImageURL(editableItem.value.image);
}

function isFormValid() {
  if (
    editableItem.value.name == "" ||
    editableItem.value.subject == "" ||
    editableItem.value.sign_up == "" ||
    editableItem.value.description == "" ||
    editableItem.value.image == "" ||
    Object.keys(editableItem.value.leader).length == 0
  )
    return false;
  for (const leader of Object.values(editableItem.value.leader)) {
    if (leader.email == "" || leader.role == "") return false;
  }
  return true;
}

const areErrors = ref(false);
function saveChanges() {
  if (isFormValid()) {
    const updatedItem = {
      ...editableItem.value,
      is_active: true,
    };

    submitClub(props.selectedKey, updatedItem);
    emit("closeEditing", true);
  } else {
    areErrors.value = true;
  }
}
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
p {
  margin-bottom: 0;
}
input[placeholder="Meeting room"] {
  margin-bottom: 2rem;
}
input[type="text"],
input[type="email"] {
  width: calc(50% - 16px);
  border: 0;
  border-bottom: 1px solid black;
  outline: 0;
  display: block;
  margin-top: 0.5rem;
}
.people-box {
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.people-box p {
  margin: 0;
  font-size: 1rem;
}
.people-box p strong {
  font-weight: bold;
}
.new-people-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 50%; /* Limit to 50% width */
}
.new-people-box input[type="text"],
.new-people-box input[type="email"] {
  width: 100%; /* Full width within the 50% container */
}
.people-inputs {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.add-button {
  height: 40px;
  width: auto;
  margin-left: 8px;
}
.remove-button {
  color: red;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  padding-right: 15px;
  background: none;
  border: none;
  align-self: center; /* Ensures it's centered vertically */
}
.error-message {
  color: red;
  font-size: 0.875rem;
  margin-top: 0rem;
}
.h5-input {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  line-height: 1.2;
  font-weight: bold;
}
.modal-body div:not(.form-check):not(.people-section):not(.people-box):not(.new-people-box) {
  margin-bottom: 1rem;
}
.form-select {
  display: inline;
  width: calc((50% - 16px - 2rem) / 3);
}
.form-select.days {
  display: block;
  width: calc(50% - 16px);
}
h5 {
  padding-bottom: 0.5rem;
}
.image-box {
  padding-left: 10px;
  width: 50%;
  float: right;
  display: flex;
  flex-direction: column;
  align-items: right;
  gap: 8px; /* Add gap between image and button */
}
.file-upload {
  width: 100%;
  height: auto; /* Adjust height to fit content */
  background-color: #e0e0e0; /* Light gray */
  color: #333;
  border-radius: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
img {
  width: 100%;
  border-radius: 10px;
  margin-top: 1rem;
}
textarea {
  width: 100%;
  resize: none;
}
.btn {
  margin-right: 1rem;
}
</style>
