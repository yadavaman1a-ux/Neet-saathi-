/* NEET Saathi: single-file app logic. No build step, no dependencies.
   All data lives in localStorage on the phone. Only the AI Mentor talks to the internet. */
(function () {
'use strict';

const D = window.NS_DATA;
const KEY = 'neet-saathi.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad = (n) => String(n).padStart(2, '0');
const dkey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORD = [1, 2, 3, 4, 5, 6, 0];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SUBJ = ['P', 'C', 'B'];
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const fmtDate = (k) => { const d = parseKey(k); return DN[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); };
const fmtShort = (k) => { const d = parseKey(k); return d.getDate() + ' ' + MON[d.getMonth()].slice(0, 3); };
const dayLabel = (k) => { const t = dkey(); if (k === t) return 'Aaj'; if (k === addDays(t, 1)) return 'Kal'; if (k === addDays(t, -1)) return 'Beeta kal'; return fmtDate(k); };
const hm = (m) => { m = Math.round(m); const h = Math.floor(m / 60); return h ? h + 'h ' + pad(m % 60) + 'm' : m + 'm'; };
const byDate = (a, b) => a.date.localeCompare(b.date);

/* ---------- state ---------- */
let S;
function defaults() {
  const chapters = []; let n = 0;
  SUBJ.forEach((s) => D.chapters[s].forEach(([cls, name]) => chapters.push({ id: 'c' + (++n), s, cls, name, f: [0, 0, 0, 0, 0, 0] })));
  return {
    v: 1,
    settings: { name: '', exam: '2027-05-02', lead: 5, notif: false, mcq: 90, key: '', model: 'gemini-flash-lite-latest', theme: 'auto' },
    routine: D.routine.map((r) => Object.assign({ id: uid() }, r)),
    done: {}, goals: {}, lectures: [], chapters, backlog: [], practice: [], mocks: [],
    focus: { log: [], active: null }, chat: [], notified: {}
  };
}
const OLD_ROUTINE = ['Uthna, fresh hona, paani', 'Biology NCERT padhna', 'Lecture ke liye ready, notes copy', 'Physics DPP aur numericals', 'Chemistry revision', 'Biology MCQ practice', 'Backlog clear karna', 'Din ka review aur sona'];
function migrateRoutine() {
  if (S.routineV === 2) return;
  const same = S.routine.length === OLD_ROUTINE.length && S.routine.every((r, i) => r.title === OLD_ROUTINE[i]);
  if (same) { S.routine = D.routine.map((r) => Object.assign({ id: uid() }, r)); S.routineV = 2; }
}
function load() {
  const d = defaults(), ds = Object.assign({}, d.settings);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      S = Object.assign(d, o);
      S.settings = Object.assign(ds, o.settings || {});
      if (S.settings.model === 'gemini-flash-latest') S.settings.model = 'gemini-flash-lite-latest';
      S.focus = Object.assign({ log: [], active: null }, o.focus || {});
      migrateRoutine();
      return;
    }
  } catch (e) { /* fall through to defaults */ }
  S = d; S.routineV = 2;
}
let saveT;
function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Phone ki storage full hai, data save nahi hua'); } }
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 150); }

const ui = {
  tab: 'home', plan: 'daily', track: 'syllabus', date: dkey(), month: dkey().slice(0, 7),
  editR: false, editL: false, editSyl: false, sylSub: 'all', pType: 'all', mockOpen: null, showDone: false,
  busy: false, focus: { subj: 'P', min: 45, task: '' }
};
let deferredInstall = null;

/* ---------- derived data ---------- */
function itemsFor(dk) {
  const dow = parseKey(dk).getDay(), out = [];
  S.routine.forEach((r) => { if (!r.days || r.days.includes(dow)) out.push({ id: r.id, time: r.time, title: r.title, subj: r.subj, kind: 'r' }); });
  S.lectures.forEach((l) => { if (l.days.includes(dow)) out.push({ id: l.id, time: l.time, title: l.topic, subj: l.subj, kind: 'l' }); });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}
const isDone = (dk, id) => !!(S.done[dk] && S.done[dk][id]);
function toggleDone(dk, id) {
  const o = S.done[dk] || (S.done[dk] = {});
  if (o[id]) delete o[id]; else o[id] = 1;
  if (!Object.keys(o).length) delete S.done[dk];
  save();
}
function dayPct(dk) { const it = itemsFor(dk); return it.length ? it.filter((i) => isDone(dk, i.id)).length / it.length : null; }
const minsOn = (dk) => S.focus.log.filter((l) => l.date === dk).reduce((a, l) => a + l.min, 0);
function weekStart(dk) { const d = parseKey(dk); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dkey(d); }
function minsWeek() { const a = weekStart(dkey()), b = addDays(a, 6); return S.focus.log.filter((l) => l.date >= a && l.date <= b).reduce((x, l) => x + l.min, 0); }
function isActive(dk) { const p = dayPct(dk); return minsOn(dk) >= 30 || (p !== null && p >= 0.5); }
function streak() { let k = dkey(), n = 0; if (!isActive(k)) k = addDays(k, -1); while (isActive(k) && n < 2000) { n++; k = addDays(k, -1); } return n; }
const chPct = (c) => c.f.reduce((a, b) => a + (b ? 1 : 0), 0) / 6;
function subjPct(s) { const cs = S.chapters.filter((c) => c.s === s); return cs.length ? cs.reduce((a, c) => a + chPct(c), 0) / cs.length : 0; }
const qToday = () => S.practice.filter((p) => p.date === dkey()).reduce((a, p) => a + p.total, 0);
function practiceStats(days) {
  const from = addDays(dkey(), -days + 1), r = { P: { t: 0, c: 0 }, C: { t: 0, c: 0 }, B: { t: 0, c: 0 } };
  S.practice.filter((p) => p.date >= from).forEach((p) => { if (r[p.s]) { r[p.s].t += p.total; r[p.s].c += p.correct; } });
  return r;
}
const mockMarks = (m) => ({ P: 4 * m.P.c - m.P.w, C: 4 * m.C.c - m.C.w, B: 4 * m.B.c - m.B.w });
const mockTotal = (m) => { const x = mockMarks(m); return x.P + x.C + x.B; };
function weakChapters() {
  const map = {};
  S.mocks.forEach((m) => (m.weak || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean).forEach((w) => {
    const k = w.toLowerCase(); (map[k] = map[k] || { name: w, n: 0 }).n++;
  }));
  return Object.values(map).sort((a, b) => b.n - a.n);
}

/* ---------- small html helpers ---------- */
const pill = (s) => (s && D.subjects[s]) ? '<span class="pill s-' + s + '">' + D.subjects[s].short + '</span>' : '';
const subjOpts = (sel, none) => (none ? '<option value=""' + (sel === '' ? ' selected' : '') + '>General</option>' : '') +
  SUBJ.map((s) => '<option value="' + s + '"' + (sel === s ? ' selected' : '') + '>' + D.subjects[s].name + '</option>').join('');
const seg = (key, opts, cur) => '<div class="seg">' + opts.map(([v, l]) => '<button data-act="seg" data-k="' + key + '" data-v="' + v + '" class="' + (v === cur ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
const empty = (t, m) => '<div class="empty"><b>' + t + '</b>' + m + '</div>';
const dowChecks = (days) => ORD.map((d) => '<label class="dchip"><input type="checkbox" name="d" value="' + d + '"' + (days.includes(d) ? ' checked' : '') + '><span>' + DN[d] + '</span></label>').join('');
function ring(p, size, sw, label) {
  p = Math.max(0, Math.min(1, p || 0));
  const r = (size - sw) / 2, C = 2 * Math.PI * r, c = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + Math.round(p * 100) + '%">' +
    '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--surface2)" stroke-width="' + sw + '"/>' +
    (p > 0 ? '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + (C * p).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 ' + c + ' ' + c + ')"/>' : '') +
    '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="' + Math.round(size * 0.24) + '" font-weight="750" fill="var(--ink)">' + label + '</text></svg>';
}
function itemRow(dk, i) {
  const d = isDone(dk, i.id);
  return '<div class="item' + (d ? ' done' : '') + '"><button class="tick' + (d ? ' on' : '') + '" data-act="tick" data-d="' + dk + '" data-id="' + i.id + '" aria-label="Done">' + CHECK + '</button>' +
    '<div class="item-b"><div class="item-t">' + esc(i.title) + '</div><div class="item-m">' + (i.kind === 'l' ? '<span class="tag">PW Yakeen</span>' : '') + pill(i.subj) + '</div></div><div class="time">' + esc(i.time) + '</div></div>';
}
function toast(m) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = m; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---------- views ---------- */
function vHome() {
  const dk = dkey(), now = new Date();
  const examD = parseKey(S.settings.exam);
  const left = isNaN(examD) ? null : Math.max(0, Math.ceil((examD - parseKey(dk)) / 864e5));
  const it = itemsFor(dk), done = it.filter((i) => isDone(dk, i.id)).length, pct = it.length ? done / it.length : 0;
  const hhmm = pad(now.getHours()) + ':' + pad(now.getMinutes());
  const next = it.find((i) => i.time >= hhmm && !isDone(dk, i.id));
  const lec = it.filter((i) => i.kind === 'l');
  const pend = S.backlog.filter((b) => !b.done).length;
  const q = qToday(), tgt = +S.settings.mcq || 0;
  const last = S.mocks.slice().sort(byDate).pop();
  const name = S.settings.name ? ', ' + esc(S.settings.name) : '';
  let h = '';
  h += '<section class="card hero"><div class="lbl">Namaste' + name + '! NEET tak</div><div class="row spread"><div class="big">' + (left == null ? '--' : left) + '</div><div style="text-align:right"><div style="font-weight:700">din baaki</div><div class="lbl">' + (left == null ? '' : '&asymp; ' + Math.floor(left / 7) + ' hafte') + '</div></div></div><div class="lbl">' + (left == null ? 'Settings mein exam date daalo' : fmtDate(S.settings.exam) + ' ke hisaab se. Sahi date Settings mein badlo.') + '</div></section>';
  if (deferredInstall) h += '<section class="card flat row spread"><div><b>App install karo</b><div class="muted small">Home screen se seedha khulega, offline bhi chalega.</div></div><button class="btn sm" data-act="install">Install</button></section>';
  h += '<div class="grid2"><section class="card"><h2>Aaj ka routine</h2><div class="row">' + ring(pct, 76, 9, Math.round(pct * 100) + '%') + '<div class="stat"><b>' + done + '/' + it.length + '</b><span>kaam ho gaye</span></div></div></section>';
  h += '<section class="card"><h2>Padhai</h2><div class="stat"><b>' + hm(minsOn(dk)) + '</b><span>aaj focus mein</span></div><div class="stat"><b>' + streak() + ' din</b><span>streak</span></div></section></div>';
  if (next) h += '<section class="card"><h2>Ab aage</h2>' + itemRow(dk, next) + '</section>';
  else if (it.length) h += '<section class="card"><h2>Ab aage</h2><div class="muted">Aaj ke baaki kaam ho gaye ya time nikal gaya. Backlog ya MCQ practice kar lo.</div></section>';
  if (lec.length) h += '<section class="card"><h2>Aaj ke PW Yakeen lectures</h2>' + lec.map((i) => itemRow(dk, i)).join('') + '</section>';
  h += '<section class="card"><div class="card-h"><h2>Syllabus</h2><button class="linkbtn" data-act="go" data-tab="track" data-sub="syllabus">Khol</button></div>' +
    SUBJ.map((s) => { const p = subjPct(s); return '<div class="row"><div style="width:74px;font-weight:650">' + D.subjects[s].name + '</div><div class="bar s-' + s + ' grow"><i style="width:' + Math.round(p * 100) + '%"></i></div><div style="width:40px;text-align:right;font-weight:700">' + Math.round(p * 100) + '%</div></div>'; }).join('') + '</section>';
  h += '<div class="grid3"><section class="card"><div class="stat"><b>' + pend + '</b><span>backlog pending</span></div></section>' +
    '<section class="card"><div class="stat"><b>' + q + '<small class="muted" style="font-size:13px">/' + tgt + '</small></b><span>MCQ aaj</span></div></section>' +
    '<section class="card"><div class="stat"><b>' + (last ? mockTotal(last) : '--') + '</b><span>last mock /720</span></div></section></div>';
  h += '<div class="grid2"><button class="btn" data-act="tab" data-v="focus">Focus shuru karo</button><button class="btn ghost" data-act="tab" data-v="mentor">Hanuman se pucho</button></div>';
  return h;
}

function vPlan() {
  return seg('plan', [['daily', 'Daily'], ['monthly', 'Monthly'], ['yakeen', 'PW Yakeen']], ui.plan) + ({ daily: vDaily, monthly: vMonthly, yakeen: vYakeen }[ui.plan])();
}
function vDaily() {
  const dk = ui.date, it = itemsFor(dk), done = it.filter((i) => isDone(dk, i.id)).length;
  const offer = S.routineV !== 2 ? '<section class="card"><h3>Naya AIIMS Rishikesh routine</h3><div class="muted small">Tumne purane routine mein badlav kiye the, isliye maine use apne aap nahi badla. Naya lagane se current routine hat jayega.</div><div class="row wrap"><button class="btn sm" data-act="aiimsRoutine">Naya routine lagao</button><button class="btn ghost sm" data-act="routineSkip">Rehne do</button></div></section>' : '';
  let h = offer + '<section class="card"><div class="row spread"><button class="icon-btn" data-act="dnav" data-v="-1" aria-label="Pichhla din">&#8249;</button><div style="text-align:center"><b>' + dayLabel(dk) + '</b>' + (dk !== dkey() ? '<div><button class="linkbtn" data-act="dtoday">Aaj pe jao</button></div>' : '<div class="muted small">' + fmtDate(dk) + '</div>') + '</div><button class="icon-btn" data-act="dnav" data-v="1" aria-label="Agla din">&#8250;</button></div>';
  h += '<div class="row"><div class="bar grow"><i style="width:' + (it.length ? Math.round(done / it.length * 100) : 0) + '%"></i></div><b>' + done + '/' + it.length + '</b></div></section>';
  h += '<section class="card"><div class="card-h"><h2>Timeline</h2><button class="linkbtn" data-act="editr">' + (ui.editR ? 'Ho gaya' : 'Routine edit') + '</button></div>';
  if (!it.length) h += empty('Is din ke liye kuch nahi', 'Routine edit karke kaam jodo.');
  h += it.map((i) => {
    if (ui.editR && i.kind === 'r') {
      const r = S.routine.find((x) => x.id === i.id);
      return '<div class="erow"><div class="erow-a"><input type="time" value="' + esc(r.time) + '" data-edit="routine" data-f="time" data-id="' + r.id + '"><select data-edit="routine" data-f="subj" data-id="' + r.id + '">' + subjOpts(r.subj || '', true) + '</select><button class="x" data-act="rdel" data-id="' + r.id + '" aria-label="Hatao">&times;</button></div>' +
        '<input type="text" value="' + esc(r.title) + '" data-edit="routine" data-f="title" data-id="' + r.id + '"><div class="dows">' + ORD.map((d) => '<button class="dow' + (r.days.includes(d) ? ' on' : '') + '" data-act="idow" data-id="' + r.id + '" data-v="' + d + '">' + DN[d] + '</button>').join('') + '</div></div>';
    }
    return itemRow(dk, i);
  }).join('') + '</section>';
  if (ui.editR) h += '<section class="card"><h2>Naya kaam jodo</h2><form class="form" data-form="addRoutine"><div class="grid2"><label class="field"><span>Time</span><input type="time" name="time" value="07:00" required></label><label class="field"><span>Subject</span><select name="subj">' + subjOpts('', true) + '</select></label></div><label class="field"><span>Kaam</span><input type="text" name="title" placeholder="Jaise: Physics PYQ solve karna" required></label><div class="dows">' + dowChecks([0, 1, 2, 3, 4, 5, 6]) + '</div><button class="btn">Jodo</button></form></section>';
  return h;
}
function vMonthly() {
  const [y, m] = ui.month.split('-').map(Number), first = new Date(y, m - 1, 1), nd = new Date(y, m, 0).getDate();
  const off = (first.getDay() + 6) % 7, today = dkey();
  let cells = ORD.map((d) => '<div class="wd">' + DN[d][0] + (d === 6 || d === 0 ? '' : '') + '</div>').join('');
  for (let i = 0; i < off; i++) cells += '<div class="cell blank"></div>';
  let sum = 0, cnt = 0, act = 0;
  for (let d = 1; d <= nd; d++) {
    const k = y + '-' + pad(m) + '-' + pad(d), p = dayPct(k), past = k <= today;
    if (past && p !== null) { sum += p; cnt++; }
    if (past && isActive(k)) act++;
    const l = (past && p !== null) ? (p > 0 ? (0.18 + 0.5 * p).toFixed(2) : 0) : 0;
    cells += '<button class="cell' + (p === null ? ' dim' : '') + (k === today ? ' today' : '') + (k === ui.date ? ' sel' : '') + '" style="--l:' + l + '" data-act="gotoDay" data-d="' + k + '" aria-label="' + fmtDate(k) + '"><span>' + d + '</span></button>';
  }
  const prefix = ui.month, mm = S.focus.log.filter((l) => l.date.startsWith(prefix)).reduce((a, l) => a + l.min, 0);
  const goals = S.goals[ui.month] || [];
  let h = '<section class="card"><div class="row spread"><button class="icon-btn" data-act="mnav" data-v="-1" aria-label="Pichhla mahina">&#8249;</button><b>' + MON[m - 1] + ' ' + y + '</b><button class="icon-btn" data-act="mnav" data-v="1" aria-label="Agla mahina">&#8250;</button></div><div class="cal">' + cells + '</div><div class="muted small">Jitna gehra rang, utna zyada routine pura hua. Din dabao to uska plan khulega.</div></section>';
  h += '<section class="card"><h2>Is mahine ka hisaab</h2><div class="grid3"><div class="stat"><b>' + (cnt ? Math.round(sum / cnt * 100) : 0) + '%</b><span>avg routine</span></div><div class="stat"><b>' + hm(mm) + '</b><span>focus time</span></div><div class="stat"><b>' + act + '</b><span>active din</span></div></div></section>';
  h += '<section class="card"><h2>Monthly goals</h2>' + (goals.length ? goals.map((g) => '<div class="item' + (g.done ? ' done' : '') + '"><button class="tick' + (g.done ? ' on' : '') + '" data-act="gdone" data-id="' + g.id + '" aria-label="Done">' + CHECK + '</button><div class="item-b"><div class="item-t">' + esc(g.text) + '</div></div><button class="x" data-act="gdel" data-id="' + g.id + '" aria-label="Hatao">&times;</button></div>').join('') : empty('Abhi koi goal nahi', 'Jaise: Physics Mechanics khatam, 3 mock dena.')) +
    '<form class="row" data-form="addGoal"><input type="text" name="text" placeholder="Is mahine ka target" required><button class="btn sm">Jodo</button></form></section>';
  return h;
}
function weekDate(dow) { return addDays(weekStart(dkey()), (dow + 6) % 7); }
function vYakeen() {
  const today = new Date().getDay();
  let total = 0, got = 0;
  let h = '<section class="card flat"><div class="muted small">PW Yakeen ka apna weekly timetable yahan daalo. Har lecture ka reminder time se pehle aayega aur dekha hua tick kar sakte ho.</div></section>';
  const cols = ORD.map((dow) => {
    const ls = S.lectures.filter((l) => l.days.includes(dow)).sort((a, b) => a.time.localeCompare(b.time));
    const dk = weekDate(dow);
    const rows = ls.map((l) => {
      total++; const d = isDone(dk, l.id); if (d) got++;
      if (ui.editL) {
        return '<div class="erow"><div class="erow-a"><input type="time" value="' + esc(l.time) + '" data-edit="lectures" data-f="time" data-id="' + l.id + '"><select data-edit="lectures" data-f="subj" data-id="' + l.id + '">' + subjOpts(l.subj || '', true) + '</select><button class="x" data-act="ldel" data-id="' + l.id + '" aria-label="Hatao">&times;</button></div><input type="text" value="' + esc(l.topic) + '" data-edit="lectures" data-f="topic" data-id="' + l.id + '"><div class="dows">' + ORD.map((x) => '<button class="dow' + (l.days.includes(x) ? ' on' : '') + '" data-act="idow" data-coll="lectures" data-id="' + l.id + '" data-v="' + x + '">' + DN[x] + '</button>').join('') + '</div></div>';
      }
      return itemRow(dk, { id: l.id, time: l.time, title: l.topic, subj: l.subj, kind: 'r' });
    }).join('');
    return { dow, dk, ls, rows };
  });
  h += '<section class="card"><div class="card-h"><h2>Is hafte ke lectures</h2><b>' + got + '/' + total + ' dekhe</b></div><div class="bar"><i style="width:' + (total ? Math.round(got / total * 100) : 0) + '%"></i></div></section>';
  if (!S.lectures.length) h += '<section class="card">' + empty('Timetable khaali hai', 'Neeche se apne Yakeen lectures jodo. Ek lecture kai din ke liye ek saath daal sakte ho.') + '</section>';
  cols.forEach((c) => {
    if (!c.ls.length && !ui.editL) return;
    h += '<section class="card"><div class="card-h"><h3>' + DN[c.dow] + ' <span class="muted small">' + fmtShort(c.dk) + '</span></h3>' + (c.dow === today ? '<span class="tag">Aaj</span>' : '') + '</div>' + (c.rows || '<div class="muted small">Is din koi lecture nahi</div>') + '</section>';
  });
  h += '<div class="row"><button class="btn ghost sm" data-act="editl">' + (ui.editL ? 'Edit band karo' : 'Lectures edit karo') + '</button></div>';
  h += '<section class="card"><h2>Naya lecture jodo</h2><form class="form" data-form="addLecture"><div class="grid2"><label class="field"><span>Time</span><input type="time" name="time" value="09:00" required></label><label class="field"><span>Subject</span><select name="subj">' + subjOpts('P', false) + '</select></label></div><label class="field"><span>Topic / chapter</span><input type="text" name="topic" placeholder="Jaise: Laws of Motion, Lecture 4" required></label><div class="dows">' + dowChecks([1, 2, 3, 4, 5, 6]) + '</div><button class="btn">Timetable mein jodo</button></form></section>';
  return h;
}

function vFocus() {
  const dk = dkey(), f = ui.focus, logs = S.focus.log.slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 8);
  const bySub = {}; S.focus.log.filter((l) => l.date === dk).forEach((l) => { bySub[l.subj || ''] = (bySub[l.subj || ''] || 0) + l.min; });
  let h = '<section class="card"><h2>Nayi study session</h2>';
  h += '<div class="chips">' + SUBJ.concat(['']).map((s) => '<button class="chip' + (f.subj === s ? ' on' : '') + '" data-act="fset" data-k="subj" data-v="' + s + '">' + (s ? D.subjects[s].name : 'Other') + '</button>').join('') + '</div>';
  h += '<div class="chips">' + [25, 45, 60, 90].map((m) => '<button class="chip' + (+f.min === m ? ' on' : '') + '" data-act="fset" data-k="min" data-v="' + m + '">' + m + ' min</button>').join('') + '</div>';
  h += '<div class="grid2"><label class="field"><span>Ya apna time (min)</span><input type="number" id="f-min" min="1" max="240" value="' + (+f.min) + '"></label><label class="field"><span>Kya padhoge?</span><input type="text" id="f-task" value="' + esc(f.task) + '" placeholder="Jaise: Thermodynamics PYQ"></label></div>';
  h += '<button class="btn block" data-act="fstart">Focus shuru karo</button><div class="muted small">Session mein screen on rehti hai aur gino jaata hai ki tumne kitni baar app chhoda. Doosre apps block karna browser se mumkin nahi, isliye phone ka Do Not Disturb on kar lo.</div></section>';
  h += '<section class="card"><h2>Aaj aur is hafte</h2><div class="grid3"><div class="stat"><b>' + hm(minsOn(dk)) + '</b><span>aaj</span></div><div class="stat"><b>' + hm(minsWeek()) + '</b><span>is hafte</span></div><div class="stat"><b>' + streak() + '</b><span>din streak</span></div></div>' +
    (Object.keys(bySub).length ? '<div class="chips">' + Object.keys(bySub).map((s) => '<span class="pill ' + (s ? 's-' + s : '') + '">' + (s ? D.subjects[s].name : 'Other') + ' ' + hm(bySub[s]) + '</span>').join('') + '</div>' : '') + '</section>';
  h += '<section class="card"><h2>Pichhli sessions</h2>' + (logs.length ? logs.map((l) => '<div class="item"><div class="item-b"><div class="item-t">' + esc(l.task || 'Focus session') + '</div><div class="item-m">' + pill(l.subj) + '<span class="muted small">' + fmtShort(l.date) + (l.dist ? ' &middot; ' + l.dist + ' baar app chhoda' : '') + '</span></div></div><div class="time">' + hm(l.min) + '</div></div>').join('') : empty('Abhi koi session nahi', 'Pehli session shuru karo.')) + '</section>';
  return h;
}

function vTrack() {
  return seg('track', [['syllabus', 'Syllabus'], ['backlog', 'Backlog'], ['practice', 'DPP/MCQ'], ['mocks', 'Mocks']], ui.track) +
    ({ syllabus: vSyllabus, backlog: vBacklog, practice: vPractice, mocks: vMocks }[ui.track])();
}
function vSyllabus() {
  let h = '<section class="card"><h2>Physics, Chemistry, Biology</h2>' + SUBJ.map((s) => {
    const cs = S.chapters.filter((c) => c.s === s), full = cs.filter((c) => chPct(c) === 1).length, p = subjPct(s);
    return '<div><div class="row spread"><b>' + D.subjects[s].name + '</b><span class="muted small">' + full + '/' + cs.length + ' chapter pure &middot; ' + Math.round(p * 100) + '%</span></div><div class="bar s-' + s + '" style="margin-top:6px"><i style="width:' + Math.round(p * 100) + '%"></i></div></div>';
  }).join('') + '<div class="muted small">Har chapter ke 6 steps: Lec (lecture), NCERT, DPP, PYQ, R1, R2 (revision).</div></section>';
  h += '<div class="chips">' + [['all', 'Sab']].concat(SUBJ.map((s) => [s, D.subjects[s].name])).map(([v, l]) => '<button class="chip' + (ui.sylSub === v ? ' on' : '') + '" data-act="sylsub" data-v="' + v + '">' + l + '</button>').join('') + '<button class="chip" data-act="edits">' + (ui.editSyl ? 'Edit band' : 'Edit') + '</button></div>';
  (ui.sylSub === 'all' ? SUBJ : [ui.sylSub]).forEach((s) => {
    const cs = S.chapters.filter((c) => c.s === s);
    h += '<section class="card"><div class="sub-h"><h3 class="s-' + s + '" style="color:var(--pc)">' + D.subjects[s].name + '</h3><span class="muted small">' + cs.length + ' chapters</span></div>' + (cs.length ? cs.map((c) =>
      '<div class="ch s-' + s + '"><div class="row spread"><div class="grow"><div style="font-weight:650;overflow-wrap:anywhere">' + esc(c.name) + '</div><div class="muted small">Class ' + (c.cls === 12 ? 'XII' : 'XI') + ' &middot; ' + Math.round(chPct(c) * 100) + '%</div></div>' + (ui.editSyl ? '<button class="x" data-act="cdel" data-id="' + c.id + '" aria-label="Chapter hatao">&times;</button>' : '') + '</div>' +
      '<div class="stages">' + D.stages.map((n, i) => '<button class="stg' + (c.f[i] ? ' on' : '') + '" data-act="stg" data-id="' + c.id + '" data-i="' + i + '" aria-label="' + D.stageNames[i] + '" aria-pressed="' + (c.f[i] ? 'true' : 'false') + '">' + n + '</button>').join('') + '</div></div>').join('') : empty('Koi chapter nahi', 'Edit se chapter jodo.')) + '</section>';
  });
  if (ui.editSyl) h += '<section class="card"><h2>Chapter jodo</h2><form class="form" data-form="addChapter"><div class="grid2"><label class="field"><span>Subject</span><select name="s">' + subjOpts('P', false) + '</select></label><label class="field"><span>Class</span><select name="cls"><option value="11">XI</option><option value="12">XII</option></select></label></div><label class="field"><span>Chapter ka naam</span><input type="text" name="name" required></label><button class="btn">Jodo</button></form><div class="muted small">Syllabus NCERT ke hisaab se bhara hai. NTA ka official syllabus dekh kar chapter hatao ya jodo.</div></section>';
  return h;
}
function vBacklog() {
  const pend = S.backlog.filter((b) => !b.done).sort((a, b) => b.pri - a.pri || a.at - b.at);
  const dn = S.backlog.filter((b) => !b.done === false).sort((a, b) => b.at - a.at);
  const P = ['Low', 'Medium', 'High'];
  const row = (b) => '<div class="item' + (b.done ? ' done' : '') + '"><button class="tick' + (b.done ? ' on' : '') + '" data-act="bdone" data-id="' + b.id + '" aria-label="Done">' + CHECK + '</button><div class="item-b"><div class="item-t">' + esc(b.text) + '</div><div class="item-m">' + pill(b.s) + (b.done ? '' : '<span class="tag' + (b.pri === 2 ? ' warn' : '') + '">' + P[b.pri] + '</span><span class="muted small">' + Math.max(0, Math.floor((Date.now() - b.at) / 864e5)) + ' din purana</span>') + '</div></div><button class="x" data-act="bdel" data-id="' + b.id + '" aria-label="Hatao">&times;</button></div>';
  let h = '<section class="card"><div class="card-h"><h2>Backlog</h2><b>' + pend.length + ' pending</b></div>' + (pend.length ? pend.map(row).join('') : empty('Backlog saaf hai', 'Koi lecture ya chapter chhoot jaye to yahan likh lo.')) + '</section>';
  h += '<section class="card"><h2>Backlog mein jodo</h2><form class="form" data-form="addBacklog"><label class="field"><span>Kya chhoota?</span><input type="text" name="text" placeholder="Jaise: Rotational Motion lecture 5 aur DPP" required></label><div class="grid2"><label class="field"><span>Subject</span><select name="s">' + subjOpts('P', false) + '</select></label><label class="field"><span>Zaroorat</span><select name="pri"><option value="2">High</option><option value="1" selected>Medium</option><option value="0">Low</option></select></label></div><button class="btn">Jodo</button></form></section>';
  if (dn.length) h += '<section class="card"><div class="card-h"><h2>Clear hue (' + dn.length + ')</h2><button class="linkbtn" data-act="bshow">' + (ui.showDone ? 'Chhupao' : 'Dikhao') + '</button></div>' + (ui.showDone ? dn.map(row).join('') : '') + '</section>';
  return h;
}
function vPractice() {
  const q = qToday(), tgt = +S.settings.mcq || 1, st = practiceStats(30);
  const list = S.practice.filter((p) => ui.pType === 'all' || p.type === ui.pType).sort((a, b) => byDate(b, a) || (b.at || 0) - (a.at || 0)).slice(0, 15);
  let h = '<section class="card"><div class="card-h"><h2>Aaj ke questions</h2><b>' + q + ' / ' + tgt + '</b></div><div class="bar"><i style="width:' + Math.min(100, Math.round(q / tgt * 100)) + '%"></i></div></section>';
  h += '<section class="card"><h2>Pichhle 30 din ki accuracy</h2>' + SUBJ.map((s) => { const x = st[s], a = x.t ? Math.round(x.c / x.t * 100) : 0; return '<div class="row"><div style="width:74px;font-weight:650">' + D.subjects[s].name + '</div><div class="bar s-' + s + ' grow"><i style="width:' + a + '%"></i></div><div style="width:92px;text-align:right" class="small"><b>' + (x.t ? a + '%' : '--') + '</b> <span class="muted">' + x.c + '/' + x.t + '</span></div></div>'; }).join('') + '</section>';
  h += '<section class="card"><h2>Practice likho</h2><form class="form" data-form="addPractice"><div class="grid2"><label class="field"><span>Type</span><select name="type"><option>DPP</option><option>MCQ</option><option>PYQ</option></select></label><label class="field"><span>Subject</span><select name="s">' + subjOpts('B', false) + '</select></label></div><label class="field"><span>Chapter (optional)</span><input type="text" name="chapter"></label><div class="grid3"><label class="field"><span>Total</span><input type="number" name="total" min="1" max="500" inputmode="numeric" required></label><label class="field"><span>Sahi</span><input type="number" name="correct" min="0" max="500" inputmode="numeric" required></label><label class="field"><span>Date</span><input type="date" name="date" value="' + dkey() + '"></label></div><button class="btn">Save</button></form></section>';
  h += '<div class="chips">' + [['all', 'Sab'], ['DPP', 'DPP'], ['MCQ', 'MCQ'], ['PYQ', 'PYQ']].map(([v, l]) => '<button class="chip' + (ui.pType === v ? ' on' : '') + '" data-act="ptype" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
  h += '<section class="card"><h2>Recent</h2>' + (list.length ? list.map((p) => '<div class="item"><div class="item-b"><div class="item-t">' + p.type + (p.chapter ? ' &middot; ' + esc(p.chapter) : '') + '</div><div class="item-m">' + pill(p.s) + '<span class="muted small">' + fmtShort(p.date) + '</span></div></div><div class="time">' + p.correct + '/' + p.total + ' <span class="muted">(' + Math.round(p.correct / p.total * 100) + '%)</span></div><button class="x" data-act="pdel" data-id="' + p.id + '" aria-label="Hatao">&times;</button></div>').join('') : empty('Abhi kuch nahi', 'Pehli DPP ya MCQ practice likho.')) + '</section>';
  return h;
}

function lineChart(vals, dates) {
  const W = 320, H = 160, L = 34, R = 12, T = 12, B = 24, n = vals.length;
  let lo = Math.max(0, Math.floor((Math.min.apply(null, vals) - 40) / 60) * 60), hi = Math.min(720, Math.ceil((Math.max.apply(null, vals) + 40) / 60) * 60);
  if (hi - lo < 120) { hi = Math.min(720, lo + 120); lo = Math.max(0, hi - 120); }
  const x = (i) => n === 1 ? L + (W - L - R) / 2 : L + (W - L - R) * i / (n - 1);
  const y = (v) => T + (H - T - B) * (1 - (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo));
  let g = '';
  for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3; g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (L - 6) + '" y="' + y(v).toFixed(1) + '" text-anchor="end" dominant-baseline="central" font-size="10" fill="var(--muted)">' + Math.round(v) + '</text>'; }
  const pts = vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  const dots = vals.map((v, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (i === n - 1 ? 4.5 : 3) + '" fill="' + (i === n - 1 ? 'var(--accent)' : 'var(--surface)') + '" stroke="var(--accent)" stroke-width="2"/>').join('');
  const lbl = '<text x="' + x(n - 1).toFixed(1) + '" y="' + (y(vals[n - 1]) - 10).toFixed(1) + '" text-anchor="' + (n > 1 ? 'end' : 'middle') + '" font-size="11" font-weight="700" fill="var(--ink)">' + vals[n - 1] + '</text>';
  const xl = n > 1 ? '<text x="' + L + '" y="' + (H - 6) + '" font-size="10" fill="var(--muted)">' + fmtShort(dates[0]) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + fmtShort(dates[n - 1]) + '</text>' : '<text x="' + x(0).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + fmtShort(dates[0]) + '</text>';
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Mock score trend">' + g + (n > 1 ? '<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' : '') + dots + lbl + xl + '</svg>';
}
function vMocks() {
  const ms = S.mocks.slice().sort(byDate);
  let h = '';
  if (ms.length) {
    const tot = ms.map(mockTotal), n = ms.length;
    const best = Math.max.apply(null, tot), avg = Math.round(tot.reduce((a, b) => a + b, 0) / n), latest = tot[n - 1];
    const delta = n > 1 ? latest - tot[n - 2] : null;
    const sm = { P: 0, C: 0, B: 0 }, att = { P: 0, C: 0, B: 0 }, cor = { P: 0, C: 0, B: 0 };
    let wrong = 0;
    ms.forEach((m) => { SUBJ.forEach((s) => { sm[s] += 4 * m[s].c - m[s].w; att[s] += m[s].c + m[s].w; cor[s] += m[s].c; wrong += m[s].w; }); });
    let weakS = SUBJ[0], wr = 2;
    SUBJ.forEach((s) => { const r = (sm[s] / n) / D.subjects[s].max; if (r < wr) { wr = r; weakS = s; } });
    const wc = weakChapters().slice(0, 5);
    h += '<section class="card"><h2>Score trend (/720)</h2>' + lineChart(tot.slice(-12), ms.slice(-12).map((m) => m.date)) + '<div class="grid3"><div class="stat"><b>' + latest + '</b><span>latest' + (delta !== null ? ' (' + (delta >= 0 ? '+' : '') + delta + ')' : '') + '</span></div><div class="stat"><b>' + best + '</b><span>best</span></div><div class="stat"><b>' + avg + '</b><span>average</span></div></div></section>';
    h += '<section class="card"><h2>Subject wise</h2>' + SUBJ.map((s) => { const a = sm[s] / n, p = Math.max(0, a / D.subjects[s].max), ac = att[s] ? Math.round(cor[s] / att[s] * 100) : 0; return '<div><div class="row spread"><b>' + D.subjects[s].name + '</b><span class="small"><b>' + Math.round(a) + '</b><span class="muted">/' + D.subjects[s].max + ' avg &middot; accuracy ' + ac + '%</span></span></div><div class="bar s-' + s + '" style="margin-top:6px"><i style="width:' + Math.round(p * 100) + '%"></i></div></div>'; }).join('') +
      '<div class="muted small">Sabse kamzor subject abhi: <b>' + D.subjects[weakS].name + '</b>. Negative marking se har mock mein average ' + (wrong / n).toFixed(1) + ' marks gaye.</div></section>';
    if (wc.length) h += '<section class="card"><h2>Baar baar galti wale chapters</h2>' + wc.map((w) => '<div class="row spread"><span>' + esc(w.name) + '</span><span class="tag">' + w.n + ' mock</span></div>').join('') + '</section>';
  }
  h += '<section class="card"><h2>Mock test likho</h2><form class="form" data-form="addMock"><div class="grid2"><label class="field"><span>Mock ka naam</span><input type="text" name="name" placeholder="PW Test 5"></label><label class="field"><span>Date</span><input type="date" name="date" value="' + dkey() + '"></label></div>' +
    SUBJ.map((s) => '<div class="row"><div style="width:74px;font-weight:650">' + D.subjects[s].name + '</div><label class="field grow"><span>Sahi (' + D.subjects[s].q + ' mein)</span><input type="number" name="' + s + 'c" min="0" max="' + D.subjects[s].q + '" inputmode="numeric" required></label><label class="field grow"><span>Galat</span><input type="number" name="' + s + 'w" min="0" max="' + D.subjects[s].q + '" inputmode="numeric" value="0" required></label></div>').join('') +
    '<label class="field"><span>Kin chapters mein galti hui? (comma se alag)</span><input type="text" name="weak" placeholder="Thermodynamics, Genetics, Electrochemistry"></label><button class="btn">Mock save karo</button><div class="muted small">Marks = 4 &times; sahi &minus; 1 &times; galat. Physics aur Chemistry 45-45, Biology 90 sawal.</div></form></section>';
  const rows = ms.slice().reverse();
  h += '<section class="card"><h2>Saare mocks</h2>' + (rows.length ? rows.map((m) => {
    const mk = mockMarks(m), open = ui.mockOpen === m.id;
    return '<div class="item"><div class="item-b"><button class="linkbtn" style="padding:0;text-align:left;color:var(--ink)" data-act="mopen" data-id="' + m.id + '"><span style="font-weight:650">' + esc(m.name) + '</span></button><div class="item-m"><span class="muted small">' + fmtShort(m.date) + '</span>' + SUBJ.map((s) => '<span class="pill s-' + s + '">' + D.subjects[s].short + ' ' + mk[s] + '</span>').join('') + '</div>' +
      (open ? '<div class="small muted" style="margin-top:8px">' + SUBJ.map((s) => D.subjects[s].name + ': ' + m[s].c + ' sahi, ' + m[s].w + ' galat, ' + (D.subjects[s].q - m[s].c - m[s].w) + ' chhoda').join('<br>') + (m.weak ? '<br>Galti: ' + esc(m.weak) : '') + '</div>' : '') + '</div><div class="time">' + mockTotal(m) + '</div><button class="x" data-act="mdel" data-id="' + m.id + '" aria-label="Hatao">&times;</button></div>';
  }).join('') : empty('Abhi koi mock nahi', 'Pehla mock likho to graph aur analysis yahan dikhega.')) + '</section>';
  return h;
}

/* ---------- AI mentor ---------- */
const QUICK = ['Aaj ka study plan banao', 'Mere weak areas batao', 'Backlog kaise clear karun?', 'Mock ke baad kya karun?', 'Thoda motivation do'];
function md(t) {
  const lines = esc(t).split('\n');
  let out = '', list = false;
  lines.forEach((raw) => {
    const l = raw.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const m = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(l);
    if (m) { if (!list) { out += '<ul>'; list = true; } out += '<li>' + m[1] + '</li>'; return; }
    if (list) { out += '</ul>'; list = false; }
    if (/^#{1,4}\s/.test(l)) out += '<p><b>' + l.replace(/^#{1,4}\s/, '') + '</b></p>';
    else if (l.trim()) out += '<p>' + l + '</p>';
  });
  return out + (list ? '</ul>' : '');
}
function vMentor() {
  let h = '';
  if (!S.settings.key) {
    h += '<section class="card"><h3>Gemini API key chahiye</h3><div class="muted">Hanuman (AI Mentor) Google Gemini se chalta hai. Free key banao: aistudio.google.com/apikey, phir Settings mein paste karo. Key sirf tumhare phone mein rehti hai.</div><button class="btn" data-act="tab" data-v="settings">Settings kholo</button></section>';
  }
  h += '<div class="chips">' + QUICK.map((q) => '<button class="chip" data-act="quick" data-v="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>';
  h += '<div class="chat">' + (S.chat.length ? S.chat.map((m) => '<div class="msg ' + m.role + '">' + (m.role === 'user' ? esc(m.text).replace(/\n/g, '<br>') : m.role === 'err' ? esc(m.text) : md(m.text)) + '</div>').join('') : '<div class="empty"><b>Hanuman tumhare AI mentor hain</b>Study plan, weak topics, doubts ya motivation, kuch bhi pucho. Wo tumhara syllabus, mocks aur backlog dekh kar jawab dete hain.</div>') + (ui.busy ? '<div class="msg model' + (ui.live ? '' : ' muted') + '" id="live">' + (ui.live ? md(ui.live) : 'Hanuman soch rahe hain...') + '</div>' : '') + '</div>';
  h += '<form class="chatbar" data-form="chat"><input type="text" name="q" placeholder="Hanuman se sawal pucho..." autocomplete="off" ' + (ui.busy ? 'disabled' : '') + '><button class="btn" ' + (ui.busy ? 'disabled' : '') + '>Bhejo</button></form>';
  if (S.chat.length) h += '<div class="row"><button class="linkbtn" data-act="chatclear">Chat saaf karo</button></div>';
  return h;
}
function mentorContext() {
  const st = practiceStats(30), ms = S.mocks.slice().sort(byDate), pend = S.backlog.filter((b) => !b.done);
  const left = Math.max(0, Math.ceil((parseKey(S.settings.exam) - parseKey(dkey())) / 864e5)) || 0;
  const acc = SUBJ.map((s) => D.subjects[s].name + ' ' + (st[s].t ? Math.round(st[s].c / st[s].t * 100) + '%' : 'data nahi')).join(', ');
  const weak = weakChapters().slice(0, 6).map((w) => w.name + ' (' + w.n + ')').join(', ') || 'abhi data nahi';
  const lowCh = S.chapters.filter((c) => chPct(c) < 0.34).slice(0, 8).map((c) => c.name).join(', ') || 'koi nahi';
  return 'Tum "Hanuman" ho, NEET UG ke AI mentor. Swabhav: shant, nidar, balwaan aur seva-bhav wale, Bajrangbali jaise. Student ka hausla badhate ho, aalas aur dar door karte ho, par jawab hamesha practical aur padhai par kendrit rakhte ho. Student ko naam ya beta kehkar bulao. Kabhi kabhi ek chhota josh bhara vaakya (jaise "Jai Bajrang Bali, ho jayega!") theek hai, par har jawab mein nahi, aur dharmik pravachan ya lambi kathayein mat sunao. Jawab practical rakho aur chhote: aam taur par 120 shabd se kam, jab tak student detail na maange. Student ka naam: ' + (S.settings.name || 'dost') + '. ' +
    'Hinglish (Roman Hindi + English) mein baat karo, jawab chhote aur clear rakho, zaroorat ho to bullet points. Biology NCERT based, Physics/Chemistry step by step samjhao. Jo pakka nahi pata wo guess mat karo, bolo ki pakka nahi hai. Medical advice mat do. ' +
    'Student ka data (isi se personal salah do):\n' +
    '- Lakshya: AIIMS Rishikesh MBBS. Pichhle 2 saal General closing AIR lagbhag 685 se 731 raha, yani bahut ooncha score chahiye (NCERT aur accuracy sabse zaroori).\n' +
    '- NEET mein ' + left + ' din baaki.\n' +
    '- Syllabus complete: Physics ' + Math.round(subjPct('P') * 100) + '%, Chemistry ' + Math.round(subjPct('C') * 100) + '%, Biology ' + Math.round(subjPct('B') * 100) + '%.\n' +
    '- Kam progress wale chapters: ' + lowCh + '.\n' +
    '- Is hafte focus padhai: ' + hm(minsWeek()) + ', streak ' + streak() + ' din.\n' +
    '- Backlog pending: ' + pend.length + (pend.length ? ' (jaise: ' + pend.slice(0, 4).map((b) => b.text).join('; ') + ')' : '') + '.\n' +
    '- 30 din ki practice accuracy: ' + acc + '. Daily MCQ target ' + S.settings.mcq + '.\n' +
    '- Last mocks (/720): ' + (ms.slice(-4).map((m) => mockTotal(m)).join(', ') || 'abhi koi nahi') + '.\n' +
    '- Mocks mein baar baar galti: ' + weak + '.';
}
// Streams the answer so text shows up word by word instead of after a long wait.
async function askGeminiOnce(model, onText) {
  const key = S.settings.key.trim();
  let hist = S.chat.filter((m) => (m.role === 'user' || m.role === 'model') && m.text).slice(-10);
  while (hist.length && hist[0].role !== 'user') hist.shift();
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: mentorContext() }] },
      contents: hist.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
    })
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const er = new Error((j.error && j.error.message) || ('HTTP ' + res.status)); er.status = res.status; throw er;
  }
  let full = '', buf = '', block = '';
  const feed = (chunk, last) => {
    buf += chunk;
    const lines = buf.split('\n'); buf = last ? '' : lines.pop();
    (last ? lines.concat(buf ? [buf] : []) : lines).forEach((ln) => {
      ln = ln.trim(); if (ln.indexOf('data:') !== 0) return;
      let j; try { j = JSON.parse(ln.slice(5)); } catch (e) { return; }
      if (j.promptFeedback && j.promptFeedback.blockReason) block = j.promptFeedback.blockReason;
      const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
      const t = parts.map((p) => p.text || '').join('');
      if (t) { full += t; if (onText) onText(full); }
    });
  };
  if (res.body && res.body.getReader) {
    const rd = res.body.getReader(), dec = new TextDecoder();
    for (;;) { const r = await rd.read(); if (r.done) break; feed(dec.decode(r.value, { stream: true }), false); }
    feed('', true);
  } else feed(await res.text(), true);
  if (!full) throw new Error(block ? 'Gemini ne jawab block kiya (' + block + ')' : 'Khaali jawab aaya, dobara try karo');
  return full;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Busy or flaky server: retry once, then switch to the other model. Never retries after text started.
async function askGemini(onText) {
  const main = (S.settings.model || 'gemini-flash-lite-latest').trim();
  const alt = main.indexOf('lite') >= 0 ? 'gemini-flash-latest' : 'gemini-flash-lite-latest';
  const plan = [main, main, alt];
  let last, got = false;
  const cb = (t) => { got = true; if (onText) onText(t); };
  for (let i = 0; i < plan.length; i++) {
    try { return await askGeminiOnce(plan[i], cb); }
    catch (e) {
      last = e;
      const retry = !got && e && (e.status === 500 || e.status === 503 || e.status === 504 || e.status === 429 || e instanceof TypeError);
      if (!retry || i === plan.length - 1) break;
      await sleep(i === 0 ? 700 : 300);
    }
  }
  throw last;
}
function scrollEnd() { requestAnimationFrame(() => window.scrollTo(0, document.documentElement.scrollHeight)); }
async function sendChat(text) {
  text = (text || '').trim();
  if (!text || ui.busy) return;
  if (!S.settings.key) { toast('Pehle Settings mein Gemini API key daalo'); return; }
  S.chat.push({ role: 'user', text });
  ui.busy = true; save(); render(); scrollEnd();
  ui.live = '';
  try { S.chat.push({ role: 'model', text: await askGemini((t) => { ui.live = t; const el = $('#live'); if (el) { el.className = 'msg model'; el.innerHTML = md(t); } if (ui.tab === 'mentor') scrollEnd(); }) }); }
  catch (e) { S.chat.push({ role: 'err', text: (navigator.onLine === false ? 'Internet nahi hai. Hanuman se baat ke liye net chahiye.' : 'Gemini error: ' + (e && e.message ? e.message : e)) }); }
  S.chat = S.chat.slice(-60); ui.busy = false; ui.live = ''; save();
  if (ui.tab === 'mentor') { render(); scrollEnd(); }
}

/* ---------- settings ---------- */
function vSettings() {
  const s = S.settings, np = ('Notification' in window) ? Notification.permission : 'unsupported';
  let h = '<section class="card"><h2>Profile</h2><label class="field"><span>Tumhara naam</span><input type="text" data-set="name" value="' + esc(s.name) + '"></label><label class="field"><span>NEET exam date</span><input type="date" data-set="exam" value="' + esc(s.exam) + '"></label><label class="field"><span>Roz ke MCQ ka target</span><input type="number" data-set="mcq" min="0" max="1000" value="' + (+s.mcq) + '"></label></section>';
  h += '<section class="card"><h2>Reminders</h2><div class="muted small">Routine aur PW lectures ke time se pehle notification aata hai. Android pe ye tab pakka chalta hai jab app khula ya background mein ho. App band hone par phone kabhi kabhi rok deta hai, isliye zaroori alarm phone ki clock app mein bhi laga lo.</div><label class="field"><span>Kitne minute pehle batao</span><input type="number" data-set="lead" min="0" max="60" value="' + (+s.lead) + '"></label>' +
    (np === 'unsupported' ? '<div class="muted">Ye browser notifications support nahi karta.</div>' : '<div class="row wrap"><button class="btn sm" data-act="notifOn">' + (s.notif && np === 'granted' ? 'Reminders on hain' : 'Reminders on karo') + '</button><button class="btn ghost sm" data-act="notifTest">Test bhejo</button><span class="muted small">Permission: ' + np + '</span></div>') + '</section>';
  h += '<section class="card"><h2>AI Mentor (Gemini)</h2><label class="field"><span>Gemini API key</span><input type="password" data-set="key" value="' + esc(s.key) + '" autocomplete="off" placeholder="AIza..."></label><label class="field"><span>Model</span><input type="text" data-set="model" value="' + esc(s.model) + '"></label><div class="muted small">Key banane ke liye aistudio.google.com/apikey kholo. Key sirf is phone mein save hoti hai aur backup mein nahi jaati. Mentor ko tumhara progress data bhi bheja jaata hai taaki salah personal ho.</div></section>';
  h += '<section class="card"><h2>Look</h2>' + '<div class="chips">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => '<button class="chip' + (s.theme === v ? ' on' : '') + '" data-act="theme" data-v="' + v + '">' + l + '</button>').join('') + '</div></section>';
  h += '<section class="card"><h2>Data aur backup</h2><div class="muted small">Sab kuch is phone mein save hai aur offline kaam karta hai. Phone badalne se pehle backup le lo.</div><div class="row wrap"><button class="btn sm" data-act="export">Backup download</button><button class="btn ghost sm" data-act="import">Backup restore</button><button class="btn ghost sm" data-act="reset" style="color:var(--bad)">Sab reset</button></div><input type="file" id="imp" accept="application/json,.json" hidden></section>';
  if (deferredInstall) h += '<section class="card"><h2>Install</h2><button class="btn" data-act="install">App install karo</button></section>';
  else h += '<section class="card"><h2>Install</h2><div class="muted small">Chrome ke menu (teen dots) mein "Install app" ya "Add to Home screen" chuno. Install ka option tab dikhta hai jab site https par khuli ho.</div></section>';
  return h;
}

const VIEWS = { home: vHome, plan: vPlan, focus: vFocus, track: vTrack, mentor: vMentor, settings: vSettings };
const TITLES = { home: 'Home', plan: 'Plan', focus: 'Focus', track: 'Track', mentor: 'Hanuman', settings: 'Settings' };

function render(keepScroll) {
  const m = $('#main'); if (!m) return;
  const y = window.scrollY;
  m.innerHTML = (VIEWS[ui.tab] || vHome)();
  $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  $('#title').textContent = TITLES[ui.tab] || 'Home';
  if (keepScroll !== false) window.scrollTo(0, y);
}
function applyTheme() {
  const t = S.settings.theme, r = document.documentElement;
  if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
}

/* ---------- reminders ---------- */
async function notify(title, body, tag) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) await reg.showNotification(title, { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [180, 80, 180], renotify: !!tag });
      else new Notification(title, { body, tag });
    }
  } catch (e) { /* notification failed, toast below still shows */ }
  if (document.visibilityState === 'visible') toast(title + ': ' + body);
}
function checkReminders() {
  if (!S.settings.notif || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), dk = dkey(now), mins = now.getHours() * 60 + now.getMinutes(), lead = Math.max(0, +S.settings.lead || 0);
  Object.keys(S.notified).forEach((k) => { if (k.indexOf(dk) !== 0) delete S.notified[k]; });
  itemsFor(dk).forEach((i) => {
    if (isDone(dk, i.id)) return;
    const [h, m] = i.time.split(':').map(Number), t = h * 60 + m, key = dk + '|' + i.id;
    if (mins >= t - lead && mins <= t && !S.notified[key]) {
      S.notified[key] = 1;
      const left = t - mins;
      notify(i.kind === 'l' ? 'PW Yakeen lecture' : 'Routine', i.title + (left > 0 ? ' (' + left + ' min baad)' : ' (abhi shuru)'), key);
    }
  });
  save();
}

/* ---------- focus mode ---------- */
let foTimer = null, wake = null;
async function lockScreen() { try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; } }
function unlockScreen() { try { if (wake) wake.release(); } catch (e) { /* ignore */ } wake = null; }
function focusRemaining(a) { return a.paused ? a.remMs : Math.max(0, a.endAt - Date.now()); }
function showFocus() {
  const a = S.focus.active; if (!a) return;
  const R = 118, C = 2 * Math.PI * R;
  $('#fo-root').innerHTML = '<div class="fo" id="fo"><div><div>' + (a.subj ? pill(a.subj) : '<span class="pill">General</span>') + '</div><div class="fo-task" style="margin-top:10px">' + esc(a.task || 'Focus session') + '</div></div>' +
    '<div><svg width="280" height="280" viewBox="0 0 280 280"><circle cx="140" cy="140" r="' + R + '" fill="none" stroke="#16222F" stroke-width="12"/><circle id="fo-arc" cx="140" cy="140" r="' + R + '" fill="none" stroke="#2CC9B8" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 140 140)"/><text id="fo-time" class="fo-time" x="50%" y="50%" text-anchor="middle" dominant-baseline="central">--:--</text></svg><div id="fo-state" style="opacity:.7;margin-top:6px"></div></div>' +
    '<div style="width:100%;display:flex;flex-direction:column;align-items:center"><div style="opacity:.7;margin-bottom:14px">App chhodne ki baar: <b id="fo-d">' + a.dist + '</b></div><div class="fo-btns"><button class="btn ghost" data-act="fpause" id="fo-pause">Pause</button><button class="btn danger" data-act="fend">Khatam</button></div></div></div>';
  clearInterval(foTimer); foTimer = setInterval(focusTick, 500); focusTick();
}
function hideFocus() { clearInterval(foTimer); foTimer = null; const r = $('#fo-root'); if (r) r.innerHTML = ''; unlockScreen(); }
function focusTick() {
  const a = S.focus.active; if (!a) { hideFocus(); return; }
  const rem = focusRemaining(a), s = Math.ceil(rem / 1000), C = 2 * Math.PI * 118;
  const t = $('#fo-time'), arc = $('#fo-arc'), st = $('#fo-state'), pb = $('#fo-pause'), d = $('#fo-d');
  if (t) t.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  if (arc) arc.setAttribute('stroke-dasharray', (C * rem / a.totalMs).toFixed(1) + ' ' + C.toFixed(1));
  if (st) st.textContent = a.paused ? 'Pause hai' : 'Focus karo, sirf yehi ek kaam';
  if (pb) pb.textContent = a.paused ? 'Resume' : 'Pause';
  if (d) d.textContent = a.dist;
  if (!a.paused && rem <= 0) focusFinish(true);
}
function focusStart(subj, min, task) {
  min = Math.max(1, Math.min(240, Math.round(+min) || 25));
  const ms = min * 60000;
  S.focus.active = { subj, task, totalMs: ms, endAt: Date.now() + ms, remMs: ms, paused: false, dist: 0, startedAt: Date.now() };
  save(); showFocus(); lockScreen();
}
function focusFinish(completed) {
  const a = S.focus.active; if (!a) return;
  const elapsed = a.totalMs - (completed ? 0 : focusRemaining(a)), mins = Math.round(elapsed / 60000);
  S.focus.active = null;
  if (mins >= 1) {
    S.focus.log.push({ id: uid(), date: dkey(new Date(a.startedAt)), subj: a.subj, task: a.task, min: mins, dist: a.dist, at: Date.now() });
    toast(completed ? 'Session poori! ' + mins + ' min focus.' : mins + ' min ka focus save hua.');
  } else toast('1 min se kam tha, save nahi hua.');
  save(); hideFocus();
  if (completed) { try { if (navigator.vibrate) navigator.vibrate([300, 120, 300]); } catch (e) { /* ignore */ } notify('Focus session poori', mins + ' min ho gaye. Chhota break lo.', 'focus-done'); }
  render();
}
function resumeFocus() {
  const a = S.focus.active; if (!a) return;
  if (!a.paused && a.endAt <= Date.now()) { focusFinish(true); return; }
  showFocus(); lockScreen();
}

/* ---------- actions ---------- */
function exportData() {
  const copy = JSON.parse(JSON.stringify(S)); copy.settings.key = '';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(copy, null, 1)], { type: 'application/json' }));
  a.download = 'neet-saathi-backup-' + dkey() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function importData(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const o = JSON.parse(fr.result);
      if (!o || typeof o !== 'object' || !o.settings || !Array.isArray(o.routine)) throw new Error('bad');
      if (!window.confirm('Current data hat kar backup ka data aayega. Pakka?')) return;
      const key = S.settings.key, d = defaults(), ds = Object.assign({}, d.settings);
      S = Object.assign(d, o); S.settings = Object.assign(ds, o.settings); S.settings.key = key; S.focus = Object.assign({ log: [], active: null }, o.focus || {}); migrateRoutine();
      saveNow(); applyTheme(); render(); toast('Backup restore ho gaya');
    } catch (e) { toast('Ye valid backup file nahi hai'); }
  };
  fr.readAsText(file);
}
const toggleIn = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) { if (arr.length > 1) arr.splice(i, 1); } else arr.push(v); };

const ACT = {
  tab(el) { ui.tab = el.dataset.v; try { history.replaceState(null, '', '#' + ui.tab); } catch (e) { /* ignore */ } render(false); window.scrollTo(0, 0); },
  go(el) { ui.tab = el.dataset.tab; ui[el.dataset.tab] = el.dataset.sub; render(false); window.scrollTo(0, 0); },
  seg(el) { ui[el.dataset.k] = el.dataset.v; render(); },
  tick(el) { toggleDone(el.dataset.d, el.dataset.id); render(); },
  dnav(el) { ui.date = addDays(ui.date, +el.dataset.v); render(); },
  dtoday() { ui.date = dkey(); render(); },
  mnav(el) { const [y, m] = ui.month.split('-').map(Number), d = new Date(y, m - 1 + (+el.dataset.v), 1); ui.month = d.getFullYear() + '-' + pad(d.getMonth() + 1); render(); },
  gotoDay(el) { ui.date = el.dataset.d; ui.plan = 'daily'; render(false); window.scrollTo(0, 0); },
  editr() { ui.editR = !ui.editR; render(); },
  aiimsRoutine() { if (window.confirm('Current routine hat kar naya AIIMS routine lagayein?')) { S.routine = D.routine.map((r) => Object.assign({ id: uid() }, r)); S.routineV = 2; save(); render(); toast('Naya routine lag gaya'); } },
  routineSkip() { S.routineV = 2; save(); render(); },
  editl() { ui.editL = !ui.editL; render(); },
  rdel(el) { S.routine = S.routine.filter((r) => r.id !== el.dataset.id); save(); render(); },
  ldel(el) { S.lectures = S.lectures.filter((r) => r.id !== el.dataset.id); save(); render(); },
  idow(el) { const it = (el.dataset.coll === 'lectures' ? S.lectures : S.routine).find((x) => x.id === el.dataset.id); if (it) { toggleIn(it.days, +el.dataset.v); save(); render(); } },
  gdone(el) { const g = (S.goals[ui.month] || []).find((x) => x.id === el.dataset.id); if (g) { g.done = !g.done; save(); render(); } },
  gdel(el) { S.goals[ui.month] = (S.goals[ui.month] || []).filter((x) => x.id !== el.dataset.id); save(); render(); },
  stg(el) { const c = S.chapters.find((x) => x.id === el.dataset.id); if (c) { c.f[+el.dataset.i] = c.f[+el.dataset.i] ? 0 : 1; save(); render(); } },
  sylsub(el) { ui.sylSub = el.dataset.v; render(); },
  edits() { ui.editSyl = !ui.editSyl; render(); },
  cdel(el) { S.chapters = S.chapters.filter((c) => c.id !== el.dataset.id); save(); render(); },
  bdone(el) { const b = S.backlog.find((x) => x.id === el.dataset.id); if (b) { b.done = !b.done; save(); render(); } },
  bdel(el) { S.backlog = S.backlog.filter((x) => x.id !== el.dataset.id); save(); render(); },
  bshow() { ui.showDone = !ui.showDone; render(); },
  ptype(el) { ui.pType = el.dataset.v; render(); },
  pdel(el) { S.practice = S.practice.filter((x) => x.id !== el.dataset.id); save(); render(); },
  mopen(el) { ui.mockOpen = ui.mockOpen === el.dataset.id ? null : el.dataset.id; render(); },
  mdel(el) { if (window.confirm('Ye mock hata dein?')) { S.mocks = S.mocks.filter((x) => x.id !== el.dataset.id); save(); render(); } },
  fset(el) {
    const t = $('#f-task'), m = $('#f-min'); if (t) ui.focus.task = t.value; if (m && el.dataset.k !== 'min') ui.focus.min = +m.value || ui.focus.min;
    ui.focus[el.dataset.k] = el.dataset.k === 'min' ? +el.dataset.v : el.dataset.v; render();
  },
  fstart() { const t = $('#f-task'), m = $('#f-min'); ui.focus.task = t ? t.value.trim() : ''; ui.focus.min = m ? (+m.value || ui.focus.min) : ui.focus.min; focusStart(ui.focus.subj, ui.focus.min, ui.focus.task); },
  fpause() { const a = S.focus.active; if (!a) return; if (a.paused) { a.endAt = Date.now() + a.remMs; a.paused = false; } else { a.remMs = Math.max(0, a.endAt - Date.now()); a.paused = true; } save(); focusTick(); },
  fend() { const a = S.focus.active; if (!a) return; const mins = Math.round((a.totalMs - focusRemaining(a)) / 60000); if (mins < 1 || window.confirm('Session abhi khatam karein? ' + mins + ' min save honge.')) focusFinish(false); },
  quick(el) { sendChat(el.dataset.v); },
  chatclear() { if (window.confirm('Poori chat saaf karein?')) { S.chat = []; save(); render(); } },
  theme(el) { S.settings.theme = el.dataset.v; applyTheme(); save(); render(); },
  async notifOn() {
    if (!('Notification' in window)) { toast('Notifications support nahi hain'); return; }
    const p = await Notification.requestPermission();
    S.settings.notif = p === 'granted'; save(); render();
    toast(p === 'granted' ? 'Reminders on ho gaye' : 'Permission nahi mili. Chrome ki site settings mein allow karo.');
  },
  async notifTest() { await notify('NEET Saathi', 'Test notification, sab theek chal raha hai.', 'test'); },
  export() { exportData(); },
  import() { const f = $('#imp'); if (f) f.click(); },
  reset() { if (window.confirm('Saara data hat jayega. Pehle backup le lo. Pakka reset karein?')) { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } location.reload(); } },
  async install() { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) { /* ignore */ } deferredInstall = null; render(); }
};

const FORMS = {
  addRoutine(f) {
    const days = f.getAll('d').map(Number), title = (f.get('title') || '').trim();
    if (!title || !days.length) { toast('Kaam ka naam aur kam se kam ek din chuno'); return false; }
    S.routine.push({ id: uid(), time: f.get('time') || '06:00', title, subj: f.get('subj') || '', days });
  },
  addLecture(f) {
    const days = f.getAll('d').map(Number), topic = (f.get('topic') || '').trim();
    if (!topic || !days.length) { toast('Topic aur kam se kam ek din chuno'); return false; }
    S.lectures.push({ id: uid(), time: f.get('time') || '09:00', topic, subj: f.get('subj') || 'P', days });
    toast('Lecture timetable mein jud gaya');
  },
  addGoal(f) { const t = (f.get('text') || '').trim(); if (!t) return false; (S.goals[ui.month] = S.goals[ui.month] || []).push({ id: uid(), text: t, done: false }); },
  addChapter(f) { const n = (f.get('name') || '').trim(); if (!n) return false; S.chapters.push({ id: uid(), s: f.get('s'), cls: +f.get('cls'), name: n, f: [0, 0, 0, 0, 0, 0] }); },
  addBacklog(f) { const t = (f.get('text') || '').trim(); if (!t) return false; S.backlog.push({ id: uid(), s: f.get('s'), text: t, pri: +f.get('pri'), done: false, at: Date.now() }); },
  addPractice(f) {
    const total = parseInt(f.get('total'), 10), correct = parseInt(f.get('correct'), 10);
    if (!(total > 0) || !(correct >= 0) || correct > total) { toast('Sahi sawal total se zyada nahi ho sakte'); return false; }
    S.practice.push({ id: uid(), date: f.get('date') || dkey(), type: f.get('type'), s: f.get('s'), chapter: (f.get('chapter') || '').trim(), total, correct, at: Date.now() });
    toast('Practice save ho gayi');
  },
  addMock(f) {
    const o = { id: uid(), date: f.get('date') || dkey(), name: (f.get('name') || '').trim() || 'Mock Test' };
    for (const s of SUBJ) {
      const c = Math.max(0, parseInt(f.get(s + 'c'), 10) || 0), w = Math.max(0, parseInt(f.get(s + 'w'), 10) || 0);
      if (c + w > D.subjects[s].q) { toast(D.subjects[s].name + ': sahi + galat ' + D.subjects[s].q + ' se zyada nahi ho sakta'); return false; }
      o[s] = { c, w };
    }
    o.weak = (f.get('weak') || '').trim(); S.mocks.push(o);
    toast('Mock save: ' + mockTotal(o) + '/720');
  }
};

function boot() {
  load(); applyTheme();
  const h = (location.hash || '').replace('#', '');
  if (VIEWS[h]) ui.tab = h;
  render(false);

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = ACT[el.dataset.act]; if (fn) fn(el, e);
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault();
    const name = f.dataset.form, fd = new FormData(f);
    if (name === 'chat') { sendChat(fd.get('q')); return; }
    if (FORMS[name] && FORMS[name](fd) !== false) { save(); render(); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'imp' && t.files && t.files[0]) { importData(t.files[0]); t.value = ''; return; }
    if (t.dataset && t.dataset.edit) {
      const it = (t.dataset.edit === 'routine' ? S.routine : S.lectures).find((x) => x.id === t.dataset.id);
      if (it) { it[t.dataset.f] = (t.dataset.f === 'time' && !t.value) ? '06:00' : t.value; save(); render(); }
    } else if (t.dataset && t.dataset.set) {
      const k = t.dataset.set; S.settings[k] = t.type === 'number' ? (+t.value || 0) : t.value; save();
    }
  });
  document.addEventListener('visibilitychange', () => {
    const a = S.focus.active;
    if (document.visibilityState === 'hidden') { if (a && !a.paused) { a.dist++; } saveNow(); }
    else { if (a) { lockScreen(); focusTick(); } checkReminders(); }
  });
  window.addEventListener('pagehide', saveNow);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (ui.tab === 'home' || ui.tab === 'settings') render(); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; toast('App install ho gaya'); });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  resumeFocus();
  setInterval(checkReminders, 20000); checkReminders();
}

window.__NS = { askGemini, S: () => S, setS: (x) => { S = x; }, ui, VIEWS, load, defaults, mockTotal, FORMS, ACT, itemsFor, md };
if (!window.__TEST) boot();
})();
