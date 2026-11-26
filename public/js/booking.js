const HOURS = [9, 10, 11, 13, 14, 15];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const label = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;

const now = new Date();
const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const first = { y: now.getFullYear(), m: now.getMonth() };
let view = { ...first };
let selDate = null;
let selHour = null;
let available = [];

function renderCalendar() {
  $('month').textContent = `${MONTHS[view.m]} ${view.y}`;
  $('prev').disabled = view.y === first.y && view.m === first.m;
  const cal = $('cal');
  cal.innerHTML = '';
  DAYS.forEach((d) => {
    const el = document.createElement('div');
    el.className = 'dow';
    el.textContent = d;
    cal.appendChild(el);
  });
  const offset = new Date(view.y, view.m, 1).getDay();
  for (let i = 0; i < offset; i++) cal.appendChild(document.createElement('div'));
  const total = new Date(view.y, view.m + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const dateStr = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
    const dow = new Date(view.y, view.m, d).getDay();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day' + (dateStr === selDate ? ' sel' : '');
    btn.textContent = d;
    btn.disabled = dow === 0 || dow === 6 || dateStr < todayStr;
    btn.addEventListener('click', () => pickDate(dateStr));
    cal.appendChild(btn);
  }
}

async function pickDate(dateStr) {
  selDate = dateStr;
  selHour = null;
  renderCalendar();
  renderSlots();
  updateSummary();
  $('slotHint').textContent = 'Loading times...';
  try {
    const res = await fetch(`/api/slots?date=${dateStr}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    available = data.available;
    $('slotHint').textContent = available.length ? '' : 'No times left on this day. Try another date.';
  } catch (err) {
    available = [];
    $('slotHint').textContent = 'Could not load times. Please try again.';
  }
  renderSlots();
}

function renderSlots() {
  const box = $('slots');
  box.innerHTML = '';
  if (!selDate) return;
  HOURS.forEach((h) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot' + (h === selHour ? ' sel' : '');
    btn.textContent = label(h);
    btn.disabled = !available.includes(h);
    btn.addEventListener('click', () => { selHour = h; renderSlots(); updateSummary(); });
    box.appendChild(btn);
  });
}

function updateSummary() {
  if (!selDate) { $('summary').textContent = 'Pick a date and time'; return; }
  const [y, m, d] = selDate.split('-').map(Number);
  const text = `${DAYS[new Date(y, m - 1, d).getDay()]}, ${MONTHS[m - 1].slice(0, 3)} ${d}`;
  $('summary').textContent = selHour === null ? text : `${text} · ${label(selHour)}`;
}

function show(kind, text) {
  const m = $('msg');
  m.className = 'msg ' + kind;
  m.textContent = text;
}

$('prev').addEventListener('click', () => { view = view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 }; renderCalendar(); });
$('next').addEventListener('click', () => { view = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 }; renderCalendar(); });

$('confirm').addEventListener('click', async () => {
  const f = $('form');
  const name = f.name.value.trim();
  const email = f.email.value.trim();
  if (!selDate || selHour === null) return show('err', 'Please choose a date and a time.');
  if (!name) return show('err', 'Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('err', 'Please enter a valid email.');

  const btn = $('confirm');
  btn.disabled = true;
  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email,
        phone: f.phone.value, business: f.business.value, topic: f.topic.value,
        date: selDate, hour: selHour, website: f.website.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      show('err', data.error || 'Something went wrong.');
      if (res.status === 409) pickDate(selDate);
    } else {
      show('ok', 'Booked! We will confirm by email.');
      f.reset();
      pickDate(selDate);
    }
  } catch (err) {
    show('err', 'Could not reach the server. Please try again.');
  } finally {
    btn.disabled = false;
  }
});

renderCalendar();
