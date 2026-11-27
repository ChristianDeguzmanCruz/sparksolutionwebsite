const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const label = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m: m - 1, d }; };
const dow = (s) => { const p = parse(s); return new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay(); };
const pretty = (s) => { const p = parse(s); return `${DAYS[dow(s)]}, ${MONTHS[p.m].slice(0, 3)} ${p.d}`; };
const prettyLong = (s) => { const p = parse(s); return `${DAYS[dow(s)]}, ${MONTHS[p.m]} ${p.d}, ${p.y}`; };

// Fallback if /api/config is unreachable: browser date + 1 day. The server still enforces the real rule.
function fallbackConfig() {
  const n = new Date();
  const t = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  const nx = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return { today: t, minDate: `${nx.getFullYear()}-${pad(nx.getMonth() + 1)}-${pad(nx.getDate())}`,
    hours: [9, 10, 11, 13, 14, 15], noticeDays: 1 };
}

let cfg = fallbackConfig();
let first = parse(cfg.today);
let view = { y: first.y, m: first.m };
let selDate = null, selHour = null, available = [];

function renderCalendar() {
  $('month').textContent = `${MONTHS[view.m]} ${view.y}`;
  $('prev').disabled = view.y === first.y && view.m === first.m;
  const cal = $('cal');
  cal.innerHTML = '';
  cal.style.animation = 'none'; void cal.offsetWidth; cal.style.animation = '';
  DAYS.forEach((d) => { const el = document.createElement('div'); el.className = 'dow'; el.textContent = d; cal.appendChild(el); });
  const offset = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  for (let i = 0; i < offset; i++) cal.appendChild(document.createElement('div'));
  const total = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  for (let d = 1; d <= total; d++) {
    const ds = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
    const w = dow(ds);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day' + (ds === selDate ? ' sel' : '') + (ds === cfg.today ? ' today' : '');
    btn.textContent = d;
    btn.disabled = w === 0 || w === 6 || ds < cfg.minDate;
    if (ds === cfg.today) btn.title = 'Today (needs at least ' + cfg.noticeDays + ' day notice)';
    btn.addEventListener('click', () => pickDate(ds));
    cal.appendChild(btn);
  }
}

function setNotice() {
  const n = cfg.noticeDays;
  $('notice').textContent = n > 0
    ? `Calls need at least ${n} day${n > 1 ? 's' : ''} notice. Earliest available weekday: ${pretty(nextWeekday(cfg.minDate))}.`
    : 'Pick any weekday. Times that already passed are not available.';
}
function nextWeekday(s) {
  let p = parse(s); let t = Date.UTC(p.y, p.m, p.d);
  while ([0, 6].includes(new Date(t).getUTCDay())) t += 86400000;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

async function pickDate(ds) {
  selDate = ds; selHour = null; available = [];
  renderCalendar(); renderSlots(); updateSummary();
  $('slotHint').textContent = 'Loading times...';
  try {
    const res = await fetch(`/api/slots?date=${ds}`);
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
  cfg.hours.forEach((h, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot' + (h === selHour ? ' sel' : '');
    btn.style.setProperty('--i', i);
    btn.textContent = label(h);
    btn.disabled = !available.includes(h);
    btn.addEventListener('click', () => { selHour = h; renderSlots(); updateSummary(); });
    box.appendChild(btn);
  });
}

function updateSummary() {
  if (!selDate) { $('summary').textContent = 'Pick a date and time'; return; }
  $('summary').textContent = selHour === null ? pretty(selDate) : `${pretty(selDate)} · ${label(selHour)}`;
}

function show(kind, text) {
  const m = $('msg');
  m.className = 'msg ' + kind;
  void m.offsetWidth;
  if (kind === 'err') m.classList.add('shake');
  m.textContent = text;
}

function openDone(date, hour) {
  $('doneWhen').textContent = `${prettyLong(date)} at ${label(hour)} (Philippine time)`;
  const d = $('done');
  d.classList.add('show');
  d.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('no-scroll');
  $('doneClose').focus();
}
function closeDone() {
  const d = $('done');
  d.classList.remove('show');
  d.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('no-scroll');
}
$('doneClose').addEventListener('click', closeDone);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDone(); });

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
      body: JSON.stringify({ name, email, phone: f.phone.value, business: f.business.value,
        topic: f.topic.value, date: selDate, hour: selHour, website: f.website.value }),
    });
    const data = await res.json();
    if (!res.ok) {
      show('err', data.error || 'Something went wrong.');
      if (res.status === 409 || res.status === 400) pickDate(selDate);
    } else {
      const d = selDate, h = selHour;
      show('', '');
      f.reset();
      selHour = null;
      pickDate(d);
      openDone(d, h);
    }
  } catch (err) {
    show('err', 'Could not reach the server. Please try again.');
  } finally {
    btn.disabled = false;
  }
});

(async function init() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) { cfg = await res.json(); first = parse(cfg.today); view = { y: first.y, m: first.m }; }
  } catch (e) { /* use fallback */ }
  // jump to the month of the earliest bookable day
  const mp = parse(cfg.minDate); view = { y: mp.y, m: mp.m };
  first = { y: parse(cfg.today).y, m: parse(cfg.today).m };
  setNotice();
  renderCalendar();
})();
