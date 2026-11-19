// Leonida Platinum Roadmap — app logic.
//
// Loads app/data/trophies.json, then renders the dashboard, the 4-step
// roadmap, the filters, the expandable guides, spoiler mode and persistence.
// URL params (for screenshots / QA):
//   ?shot=dashboard|roadmap|filter|detail
//   ?demo=1  (12 earned, in-memory only — screenshots must not pollute the
//             visitor's saved progress)
//   ?qa=roundtrip   ?category=..   ?grade=..   ?spoiler=off   ?expand=28
import { blankState, loadState, saveState, exportState, importState, roundTripOk, STORAGE_KEY } from './state.js';

const params = new URLSearchParams(location.search);
const demoMode = params.get('demo') === '1';
const DEMO_EARNED = [2, 3, 4, 8, 15, 16, 19, 21, 28, 32, 35, 42];

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const validIds = trophies.map((t) => t.id);
const TOTAL = trophies.length;

let state = loadState(localStorage);
if (demoMode) state = { ...blankState(), earned: [...DEMO_EARNED], spoiler: params.get('spoiler') !== 'off' };
if (params.get('spoiler') === 'off') state.spoiler = false;

let earned = new Set(state.earned);
let category = params.get('category') || 'all';
let expanded = new Set(params.get('expand') ? params.get('expand').split(',').map(Number) : []);

const $ = (id) => document.getElementById(id);
const ui = {
  grid: $('grid'), count: $('count'), pct: $('pct'), ring: $('ring'),
  earnedCount: $('earnedCount'), remainLine: $('remainLine'), gradebars: $('gradebars'),
  steps: $('steps'), nextup: $('nextup'), q: $('q'), grade: $('grade'),
  earnedOnly: $('earnedOnly'), missableOnly: $('missableOnly'), spoiler: $('spoiler'),
  cats: $('cats'), status: $('status'), qa: $('qa'),
};
ui.spoiler.checked = state.spoiler;
if (params.get('grade')) ui.grade.value = params.get('grade');

const CATS = [
  ['all', 'All 55'], ['story', 'Story'], ['missions', 'Missions'],
  ['activities', 'Activities'], ['collectibles', 'Collectibles'], ['misc', 'Misc'],
];
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const GUIDE_STATUS = {
  supported: 'Guide: supported by the official description + launch guides',
  'community-reported': 'Guide: community-reported method — official description only hints at it',
  'unconfirmed-method': 'Guide: exact method unconfirmed at launch — no method invented',
};

function persist() {
  if (demoMode) return; // screenshots must not pollute the visitor's saved progress
  state = { ...state, earned: [...earned].sort((a, b) => a - b), spoiler: ui.spoiler.checked };
  saveState(localStorage, state);
}

function isHidden(t) {
  return t.hidden && ui.spoiler.checked && !earned.has(t.id);
}

function gradeCounts(list) {
  const counts = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of list) {
    counts[t.grade][1] += 1;
    if (earned.has(t.id)) counts[t.grade][0] += 1;
  }
  return counts;
}

function renderHero() {
  const n = earned.size;
  const pct = Math.round((n / TOTAL) * 100);
  ui.pct.textContent = pct + '%';
  ui.ring.style.setProperty('--p', pct);
  ui.earnedCount.textContent = n;
  ui.remainLine.textContent = n === TOTAL
    ? 'Platinum earned — Vice Got a Price! is yours.'
    : `${TOTAL - n} to go — the Platinum needs every one of them.`;
  const counts = gradeCounts(trophies);
  ui.gradebars.innerHTML = Object.entries(counts).map(([g, [e, tot]]) =>
    `<div class="gbar"><span class="gname ${g}">${GRADE_LABEL[g]} ${e}/${tot}</span><span class="track"><span class="fill ${g}" style="width:${tot ? (e / tot) * 100 : 0}%"></span></span></div>`).join('');
}

function stepList() {
  const byCat = (cats) => trophies.filter((t) => cats.includes(t.category)).map((t) => t.id);
  return [
    { n: 1, title: 'Play the story', ids: byCat(['story']), note: 'Chapters 1–4, the opening and the final mission, plus the six story missions. 60–80 hours.' },
    { n: 2, title: 'Stranger strands & side finales', ids: byCat(['missions']), note: 'Eight qualifying stranger strands plus Andy, Kenton, Billy, Randy and Tyrone. Finales stay open after the credits.' },
    { n: 3, title: 'Activities & collectibles', ids: byCat(['activities', 'collectibles']), note: 'Stunts, shooting ranges, drone races, cards, WAiNK scans, vehicles. The long grind lives here.' },
    { n: 4, title: 'Cleanup & the cryptic five', ids: byCat(['misc']), note: 'Robberies, money, 100% completion (A Long Road) and the five trophies whose exact trigger is still unconfirmed.' },
  ];
}

function nextUp() {
  // Missable first, then time-sensitive, then story order, then the rest.
  const rank = (t) => (t.missable === 'potentially-missable' ? 0 : t.missable === 'time-sensitive' ? 1 : t.category === 'story' ? 2 : 3);
  return [...trophies]
    .filter((t) => !earned.has(t.id))
    .sort((a, b) => rank(a) - rank(b) || a.id - b.id)
    .slice(0, 3);
}

function renderRoadmap() {
  ui.steps.innerHTML = stepList().map((s) => {
    const done = s.ids.filter((id) => earned.has(id)).length;
    const pct = Math.round((done / s.ids.length) * 100);
    return `<li><span class="stepn">${s.n}</span><div><strong>${s.title} — ${done}/${s.ids.length}</strong><span class="track"><span class="fill" style="width:${pct}%"></span></span><span class="dim small">${s.note}</span></div></li>`;
  }).join('');
  const prio = nextUp();
  ui.nextup.innerHTML = prio.length
    ? `<h3>Do next</h3><ol>${prio.map((t) => `<li><strong>${isHidden(t) ? 'Hidden trophy' : t.name}</strong> — ${t.missable === 'potentially-missable' ? 'potentially missable: do it before its chapter ends.' : t.missable === 'time-sensitive' ? 'time-sensitive strand — do it when it appears.' : t.category === 'story' ? 'next story trophy.' : 'next on the list.'}</li>`).join('')}</ol>`
    : '<h3>Do next</h3><p>Nothing left — check the Platinum.</p>';
}

function missableBadge(t) {
  if (t.missable === 'potentially-missable') return '<span class="badge miss">Potentially missable</span>';
  if (t.missable === 'time-sensitive') return '<span class="badge warn">Time-sensitive</span>';
  return '';
}

function statusBadge(t) {
  if (t.guide_status === 'unconfirmed-method') return '<span class="badge unconf">Method unconfirmed</span>';
  if (t.guide_status === 'community-reported') return '<span class="badge comm">Community-reported</span>';
  return '';
}

function card(t) {
  const hidden = isHidden(t);
  const done = earned.has(t.id);
  const open = expanded.has(t.id);
  const el = document.createElement('article');
  el.className = 'card' + (done ? ' done' : '') + (t.missable !== 'no' ? ' flag' : '');
  el.innerHTML = `
    <label class="tick"><input type="checkbox" ${done ? 'checked' : ''} aria-label="Mark ${hidden ? 'hidden trophy' : t.name} earned"><span>${done ? 'Earned ✓' : 'Earn it'}</span></label>
    <div class="chead"><span class="grade ${t.grade}">${GRADE_LABEL[t.grade]}</span>${missableBadge(t)}${statusBadge(t)}</div>
    <h3>${hidden ? 'Hidden trophy' : t.name}</h3>
    <p class="desc">${hidden ? 'Hidden until earned — this trophy stays secret on PS5 until you unlock it.' : t.description}</p>
    <p class="meta dim small">${t.category} · #${t.id} of ${TOTAL} · ${t.hidden ? 'hidden on PS5' : 'visible on PS5'}</p>
    <button type="button" class="guideBtn" aria-expanded="${open}">${open ? 'Hide guide −' : 'Guide +'}</button>
    <div class="guide" ${open ? '' : 'hidden'}>
      ${hidden ? '<p>Guide hidden with the trophy — earn it to reveal the guide.</p>' : `<p>${t.guide}</p><p class="dim small">${GUIDE_STATUS[t.guide_status]}.<br>Sources: ${t.sources.join(' · ')}</p>`}
    </div>`;
  el.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) earned.add(t.id);
    else earned.delete(t.id);
    persist();
    renderAll();
    ui.status.textContent = e.target.checked ? `${t.name} marked earned and saved.` : `${t.name} unmarked.`;
  });
  el.querySelector('.guideBtn').addEventListener('click', () => {
    if (expanded.has(t.id)) expanded.delete(t.id);
    else expanded.add(t.id);
    renderAll();
  });
  return el;
}

function filtered() {
  const q = ui.q.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (category !== 'all' && t.category !== category) return false;
    if (ui.grade.value !== 'all' && t.grade !== ui.grade.value) return false;
    if (ui.earnedOnly.checked && !earned.has(t.id)) return false;
    if (ui.missableOnly.checked && t.missable === 'no') return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderGrid() {
  const list = filtered();
  ui.grid.replaceChildren(...list.map(card));
  ui.count.textContent = `Showing ${list.length} of ${TOTAL} trophies — ${earned.size} earned overall.`;
}

function renderCats() {
  ui.cats.innerHTML = '';
  for (const [key, label] of CATS) {
    const n = key === 'all' ? TOTAL : trophies.filter((t) => t.category === key).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (category === key ? ' on' : '');
    b.textContent = `${label} (${n})`;
    b.addEventListener('click', () => {
      category = key;
      renderCats();
      renderGrid();
    });
    ui.cats.append(b);
  }
}

function renderAll() {
  renderHero();
  renderRoadmap();
  renderGrid();
}

ui.q.addEventListener('input', renderGrid);
ui.grade.addEventListener('change', renderGrid);
ui.earnedOnly.addEventListener('change', renderGrid);
ui.missableOnly.addEventListener('change', renderGrid);
ui.spoiler.addEventListener('change', () => {
  persist();
  renderAll();
  ui.status.textContent = ui.spoiler.checked
    ? 'Spoiler mode on — hidden trophies concealed until earned.'
    : 'Spoiler mode off — all 55 names shown.';
});

$('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportState({ ...state, earned: [...earned], spoiler: ui.spoiler.checked })], { type: 'application/json' }));
  a.download = 'gta6-platinum-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
  ui.status.textContent = 'Progress exported — keep the file to restore it later.';
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { state: back, dropped } = importState(await file.text(), validIds);
    earned = new Set(back.earned);
    ui.spoiler.checked = back.spoiler;
    persist();
    renderAll();
    ui.status.textContent = `Imported ${back.earned.length} earned trophies${dropped ? ` (${dropped} unknown ids ignored)` : ''}.`;
  } catch (err) {
    ui.status.textContent = 'Import failed: ' + err.message;
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (!demoMode && !confirm('Clear all earned trophies? This cannot be undone (export first if you want a backup).')) return;
  earned = new Set();
  expanded = new Set();
  persist();
  renderAll();
  ui.status.textContent = 'Progress cleared.';
});

// Self-test (?qa=roundtrip): export -> wipe -> import, rendered into the page.
if (params.get('qa') === 'roundtrip') {
  const probe = { ...blankState(), earned: [2, 3, 28, 55], spoiler: true };
  const ok = roundTripOk(probe, validIds);
  const before = JSON.stringify([...earned].sort((a, b) => a - b));
  localStorage.removeItem(STORAGE_KEY);
  const { state: back } = importState(exportState(probe, '2026-11-19T00:00:00.000Z'), validIds);
  const restored = JSON.stringify(back.earned) === JSON.stringify([2, 3, 28, 55]);
  const line = `QA round-trip: ${ok && restored ? 'PASS' : 'FAIL'} — export → clear → import restored [2, 3, 28, 55] exactly; live state before test: ${before}.`;
  ui.qa.textContent = line;
  document.title = (ok && restored ? 'QA PASS' : 'QA FAIL') + ' — Platinum Roadmap';
}

// Shot scenes (?shot=...): hide the sections above the target via
// body[data-shot] (see style.css) instead of scrolling — headless
// --screenshot leaves scrolled-in regions unpainted.
const shot = params.get('shot');
if (shot) document.body.dataset.shot = shot;
if (shot === 'detail') {
  expanded = new Set([28]);
  ui.spoiler.checked = false;
  state.spoiler = false;
  category = 'activities';
}
if (shot === 'filter') category = 'activities';

renderCats();
renderAll();
