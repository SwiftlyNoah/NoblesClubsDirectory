<template>
  <div class="box">
    <select class="form-select hour" v-model="meetingHour">
      <option v-for="hour in [...Array(12).keys()]" :key="hour" :value="hour">{{ hour == 0 ? 12 : hour }}</option>
    </select>
    <select class="form-select minute" v-model="editableItem.minute">
      <option v-for="minute in [...Array(12).keys()]" :key="minute" :value="minute * 5">{{ minute < 2 ? "0" + (minute * 5) : minute * 5 }}</option>
    </select>
    <select class="form-select" v-model="meetingAMPM">
      <option value="am">AM</option>
      <option value="pm">PM</option>
    </select>
    <select class="form-select days" v-model="editableItem.day">
      <option v-for="(day,index) in DAYS_OF_WEEK" :key="index" :value="index">{{ day }}s</option>
    </select>
    <button v-if="canRemove" class="btn btn-danger remove-button" @click="() => $emit('removeItem')">-</button>
  </div>
</template>

<script setup>
import { defineProps,defineEmits,ref,watch } from 'vue';
import { DAYS_OF_WEEK } from '../constants';

const props = defineProps(["timeItem","canRemove"]);
const emit = defineEmits(["updateItem","removeItem"]);

const editableItem = ref(props.timeItem);
const meetingHour = ref(props.timeItem.hour <= 12 ? props.timeItem.hour : props.timeItem.hour - 12);
const meetingAMPM = ref(props.timeItem.hour < 12 ? "am" : "pm");

watch(() => props.timeItem,() => {
  editableItem.value = props.timeItem;
  /*let hourValue = value.hour;
  meetingAMPM.value = hourValue >= 12 ? "pm" : "am";
  if ( hourValue > 12 ) hourValue -= 12;
  meetingHour.value = hourValue;*/
});

watch(() => [meetingHour.value,meetingAMPM.value],([hourVarValue,ampmVarValue]) => {
  let hourValue = hourVarValue;
  if ( ampmVarValue == "pm" ) hourValue += 12;
  editableItem.value.hour = hourValue;
});

watch(() => editableItem.value,value => {
  emit("updateItem",value);
});
</script>

<style scoped>
  .form-select {
    display: inline;
    width: calc((100% - 56px - 2rem) / 3);
  }
  .form-select.hour {
    margin-right: 1rem;
  }
  .form-select.minute {
    margin-right: 1rem;
  }
  .form-select.days {
    display: block;
    width: calc(100% - 56px);
  }
  .remove-button {
    float: right;
    margin-top: -76px;
    margin-right: 16px;
    height: 76px;
  }
  .box {
    width: 50%;
  }
</style>