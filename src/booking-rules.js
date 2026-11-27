// Booking rules in one place, so the server and the tests agree.
// Everything is calculated in Philippine time (Asia/Manila), whatever the server's own clock says.
const HOURS = [9, 10, 11, 13, 14, 15]; // one-hour calls, Mon-Fri: 9, 10, 11 AM and 1, 2, 3 PM
const TIMEZONE = 'Asia/Manila';

// How many days ahead a booking must be. 1 = nothing can be booked for today.
const noticeDays = () => {
  const n = Number(process.env.BOOKING_NOTICE_DAYS ?? 1);
  return Number.isInteger(n) && n >= 0 ? n : 1;
};

function manilaNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const today = (now) => manilaNow(now).date;
const minDate = (now) => addDays(today(now), noticeDays());

function isRealDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

const isWeekday = (date) => {
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  return day >= 1 && day <= 5;
};

// A date can be booked if it is a real weekday and far enough ahead
const validDate = (date, now) => isRealDate(date) && isWeekday(date) && date >= minDate(now);

// An hour is in the past if its day is over, or it has already started today
function isPast(date, hour, now) {
  const m = manilaNow(now);
  return date < m.date || (date === m.date && hour <= m.hour);
}

const validSlot = (date, hour, now) => validDate(date, now) && HOURS.includes(hour) && !isPast(date, hour, now);
const availableHours = (date, taken, now) => HOURS.filter((h) => !taken.includes(h) && !isPast(date, h, now));

module.exports = { HOURS, TIMEZONE, noticeDays, today, minDate, addDays, validDate, validSlot, availableHours, isPast };
