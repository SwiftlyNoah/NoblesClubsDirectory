<template>
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
              Malicious submissions will be deleted.
            </p>
            <hr />
          </div>
          <div class="image-box">
            <input type="file" name="file" ref="fileButton" class="d-none" @change="triggerImageUpload" />
            <div class="file-upload-box">
              <button class="btn btn-primary file-upload" @click="fileButton.click()">
                {{ imageURL == "" ? "Upload" : "Replace" }} image
              </button>
            </div>
            <img :src="imageURL" />
          </div>
          <input type="text" class="h5-input" placeholder="Club/org name" v-model="editableItem.name" />
          <div>
            <span>Meeting time:</span>
            <div class="form-check">
              <input class="form-check-input" type="radio" value="x" v-model="meetingBlock" />
              <label class="form-check-label">{{ formatMeetingTime(BLOCKS.x) }}</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" value="o" v-model="meetingBlock" />
              <label class="form-check-label">{{ formatMeetingTime(BLOCKS.o) }}</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" value="na" v-model="meetingBlock" />
              <label class="form-check-label">Other</label>
            </div>
            <template v-if="meetingBlock == 'na'">
              <select class="form-select hour" v-model="meetingHour">
                <option v-for="hour in [...Array(12).keys()]" :key="hour" :value="hour">{{ hour == 0 ? 12 : hour }}</option>
              </select>
              <select class="form-select minute" v-model="editableItem.meeting_time.minute">
                <option v-for="minute in [...Array(12).keys()]" :key="minute" :value="minute * 5">{{ minute < 2 ? "0" + (minute * 5) : minute * 5 }}</option>
              </select>
              <select class="form-select" v-model="meetingAMPM">
                <option value="am">AM</option>
                <option value="pm">PM</option>
              </select>
              <select class="form-select days" v-model="editableItem.meeting_time.day">
                <option v-for="(day,index) in DAYS_OF_WEEK" :key="index" :value="index">{{ day }}s</option>
              </select>
            </template>
          </div>
          <div>
            <p>Meeting room:</p>
            <input type="text" placeholder="Meeting room" v-model="editableItem.meeting_room" />
          </div>
          <div>
            <p>
              Student leader(s):
              <button class="btn btn-success" @click="addLeader()">Add</button>
            </p>
            <div v-for="(leader,key) of editableItem.leader" :key="leader" class="leader-box">
              <input type="text" placeholder="Display name" v-model="leader.name" />
              <input type="email" placeholder="Email" v-model="leader.email" />
              <button class="btn btn-danger remove-button" @click="() => removeLeader(key)">-</button>
            </div>
          </div>
          <div>
            <p>Faculty advisor:</p>
            <input type="text" placeholder="Display name" v-model="editableItem.advisor.name" />
            <input type="email" placeholder="Email" v-model="editableItem.advisor.email" />
          </div>
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
          <button class="btn btn-success" @click="saveChanges()">{{ newRegister ? "Publish new listing" : "Save edits" }}</button>
          <button class="btn btn-secondary" @click="$emit('closeEditing',! newRegister)">{{ newRegister ? "Exit without publishing" : "Exit without saving" }}</button>
          <p>{{ areErrors ? "You have not completed all above fields." : "" }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps,defineEmits,ref,watch } from 'vue';
import { formatMeetingTime,timesAreEqual } from '../timeFormat';
import { DAYS_OF_WEEK,SUBJECTS,BLOCKS } from '../constants';
import { writeEntry,getImageURL,uploadImage,randomHexID } from '../db';

const props = defineProps(["selectedItem","selectedKey","newRegister"]);
const emit = defineEmits(["closeEditing"]);

const editableItem = ref({advisor:{},leader:{},meeting_time:{}});
const meetingBlock = ref("na");
const meetingHour = ref(0);
const meetingAMPM = ref("am");

function timeDataUpdate(value,skipBlocks) {
  if ( ! skipBlocks ) {
    if ( timesAreEqual(value.meeting_time,BLOCKS.x) ) meetingBlock.value = "x";
    else if ( timesAreEqual(value.meeting_time,BLOCKS.o) ) meetingBlock.value = "o";
    else meetingBlock.value = "na";
  }

  let hourValue = value.meeting_time.hour;
  meetingAMPM.value = hourValue >= 12 ? "pm" : "am";
  if ( hourValue > 12 ) hourValue -= 12;
  meetingHour.value = hourValue;
}

const imageURL = ref("");
watch(() => editableItem.value,async () => {
  if ( editableItem.value.image ) imageURL.value = await getImageURL(editableItem.value.image);
  else imageURL.value = "";
  areErrors.value = false;
});

watch(() => props.selectedItem,value => {
  console.log(value)
  editableItem.value = props.selectedItem;
  timeDataUpdate(value,false);
});

watch(() => [meetingHour.value,meetingAMPM.value],([hourVarValue,ampmVarValue]) => {
  let hourValue = hourVarValue;
  if ( ampmVarValue == "pm" ) hourValue += 12;
  editableItem.value.meeting_time.hour = hourValue;
});

watch(() => meetingBlock.value,value => {
  if ( value == "x" ) editableItem.value.meeting_time = Object.assign({},BLOCKS.x);
  else if ( value == "o" ) editableItem.value.meeting_time = Object.assign({},BLOCKS.o);
  timeDataUpdate(editableItem.value,true);
});

function addLeader() {
  editableItem.value.leader[randomHexID()] = {
    email: "",
    name: ""
  };
}

function removeLeader(key) {
  delete editableItem.value.leader[key];
}

const fileButton = ref();
async function triggerImageUpload() {
  console.log("here")
  editableItem.value.image = await uploadImage(fileButton.value.files[0]);
  imageURL.value = await getImageURL(editableItem.value.image);
}

function isFormValid() {
  if (
    editableItem.value.name == "" ||
    editableItem.value.meeting_room == "" ||
    editableItem.value.advisor.email == "" ||
    editableItem.value.advisor.name == "" ||
    editableItem.value.subject == "" ||
    editableItem.value.sign_up == "" ||
    editableItem.value.description == "" ||
    editableItem.value.image == "" ||
    Object.keys(editableItem.value.leader).length == 0
  ) return false;
  for ( const leader of Object.values(editableItem.value.leader) ) {
    if ( leader.email == "" || leader.name == "" ) return false;
  }
  return true;
}

const areErrors = ref(false);
function saveChanges() {
  if ( isFormValid() ) {
    writeEntry(props.selectedKey,editableItem.value);
    emit("closeEditing",true);
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
    padding-left: .25rem;
  }
  p {
    margin-bottom: 0;
  }
  input[type="text"],input[type="email"] {
    width: calc(50% - 16px);
    border: 0;
    border-bottom: 1px solid black;
    outline: 0;
    display: block;
    margin-top: .5rem;
  }
  .leader-box {
    width: 50%;
  }
  .leader-box input[type="text"],.leader-box input[type="email"] {
    width: calc(90% - 16px);
  }
  .remove-button {
    float: right;
    margin-top: -64px;
    height: 64px;
  }
  input[type="text"]:focus,input[type="email"]:focus {
    border-color: navy !important;
  }
  .h5-input {
    font-size: 1.25rem;
    margin-bottom: .75rem;
    line-height: 1.2;
    font-weight: bold;
  }
  .modal-body div:not(.form-check) {
    margin-bottom: 1rem;
  }
  .form-select {
    display: inline;
    width: calc((50% - 16px - 2rem) / 3);
  }
  .form-select.hour {
    margin-right: 1rem;
  }
  .form-select.minute {
    margin-right: 1rem;
  }
  .form-select.days {
    display: block;
    width: calc(50% - 16px);
  }
  h5 {
    padding-bottom: .5rem;
  }
  .image-box {
    width: 50%;
    float: right;
  }
  .image-box input {
    width: 100%;
  }
  .file-upload-box {
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
  }
  img {
    width: 100%;
    border-radius: 5px;
  }
  textarea {
    width: 100%;
    resize: none;
  }
  .btn {
    margin-right: 1rem;
  }
</style>