<template>
  <div class="modal fade" id="clubModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-body">
          <img :src="editableItem.image" />
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
            <p>Student leader:</p>
            <input type="text" placeholder="Display name" v-model="editableItem.leader.name" />
            <input type="email" placeholder="Email" v-model="editableItem.leader.email" />
          </div>
          <div>
            <p>Faculty advisor:</p>
            <input type="text" placeholder="Display name" v-model="editableItem.advisor.name" />
            <input type="email" placeholder="Email" v-model="editableItem.advisor.email" />
          </div>
          <div>
            <p>How to sign up:</p>
            <input type="text" placeholder="Sign up info" v-model="editableItem.sign_up" />
          </div>
          <div>
            <p>Mission statement:</p>
            <textarea rows="5" v-model="editableItem.description"></textarea>
          </div>
          <button class="btn btn-primary" @click="save()">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps,ref,watch } from 'vue';
import { formatMeetingTime,timesAreEqual } from '../timeFormat';
import { DAYS_OF_WEEK,BLOCKS } from '../constants';
import { writeEntry } from '../db';

const props = defineProps(["selectedItem","selectedKey","openCount"]);
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

watch(() => props.openCount,() => {
  editableItem.value = props.selectedItem;
  timeDataUpdate(props.selectedItem,false);
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

function save() {
  writeEntry(props.selectedKey,editableItem.value);
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
img {
  width: 50%;
  float: right;
  margin-bottom: 1rem;
  border-radius: 5px;
}
textarea {
  width: 100%;
  resize: none;
}
</style>