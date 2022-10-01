import { DAYS_OF_WEEK,BLOCKS } from './constants';

function formatMeetingTime(meetingTime) {
  if ( ! meetingTime ) return "";

  let hour = meetingTime.hour;
  let ampm = "AM";
  if ( hour == 0 ) {
    hour = 12;
  } else if ( hour >= 12 ) {
    ampm = "PM";
    if ( hour > 12 ) hour -= 12;
  }

  let minuteStr = meetingTime.minute.toString();
  if ( minuteStr.length == 1 ) minuteStr = "0" + minuteStr;

  let extraText = "";
  if ( timesAreEqual(meetingTime,BLOCKS.x) ) extraText = " (X-Block)";
  else if ( timesAreEqual(meetingTime,BLOCKS.o) ) extraText = " (O-Block)";

  return `${hour}:${minuteStr} ${ampm} ${DAYS_OF_WEEK[meetingTime.day]}s${extraText}`;
}

function timesAreEqual(a,b) {
  return (
    a.day == b.day &&
    a.hour == b.hour &&
    a.minute == b.minute
  );
}

export { formatMeetingTime,timesAreEqual };