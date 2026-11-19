(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- settings
  const DEFAULTS = {
    work: 60,            // seconds
    rest: 5,             // seconds
    rounds: 30,
    prep: 5,             // "get ready" lead-in before round 1 (0 = off)
    countdown: 5,        // spoken countdown during the last N seconds of work
    countdownMode: 'voice', // voice | beep | both | off
    phaseBeep: true,     // short tone together with "Work!" / "Rest!"
    voiceURI: '',        // '' = auto-pick a female English voice
    volume: 1,
  };
  const LIMITS = { work: [1, 3600], rest: [0, 3600], rounds: [1, 99], prep: [0, 60], countdown: [0, 10] };
  const STORE_KEY = 'workoutTimer.settings.v1';

  // Speech engines start talking ~100-300 ms after speak() is called, so audio
  // cues are fired slightly early to land on the second boundary.
  const AUDIO_LEAD_MS = 150;
  // When the page wakes up late (e.g. after being backgrounded) don't announce
  // a phase that started more than this long ago.
  const STALE_MS = 1500;

  const clampInt = (v, [lo, hi], fallback) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };

  function loadSettings() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (_) { /* ignore */ }
    const s = { ...DEFAULTS, ...saved };
    for (const k of Object.keys(LIMITS)) s[k] = clampInt(s[k], LIMITS[k], DEFAULTS[k]);
    return s;
  }
  function saveSettings() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (_) { /* ignore */ }
  }

  let S = loadSettings();

  // ---------------------------------------------------------------- schedule
  let segs = [];
  let total = 0;

  function buildSchedule() {
    segs = [];
    let t = 0;
    const add = (type, sec, round) => {
      if (sec <= 0) return;
      segs.push({ type, dur: sec * 1000, start: t, round });
      t += sec * 1000;
    };
    add('prep', S.prep, 1);
    for (let r = 1; r <= S.rounds; r++) {
      add('work', S.work, r);
      if (r < S.rounds) add('rest', S.rest, r);   // no rest after the final round
    }
    total = t;
  }

  function locate(ms) {
    if (ms >= total) return { idx: segs.length, rem: 0 };
    for (let i = 0; i < segs.length; i++) {
      const end = segs[i].start + segs[i].dur;
      if (ms < end) return { idx: i, rem: end - ms };
    }
    return { idx: segs.length, rem: 0 };
  }

  const ceilSec = (ms) => Math.ceil(ms / 1000 - 1e-6);

  function fmt(sec) {
    sec = Math.max(0, sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  // ---------------------------------------------------------------- engine
  // Wall-clock based: elapsed time is derived from Date.now(), so the timer
  // stays correct even if the browser throttles or suspends the page.
  const T = { status: 'idle', acc: 0, t0: 0 }; // idle | running | paused | done
  const A = { idx: -1, sec: -1 };              // last audio cue fired

  const elapsed = () => T.acc + (T.status === 'running' ? Date.now() - T.t0 : 0);

  function start() {
    unlockAudio();
    if (T.status === 'done') resetState();
    T.t0 = Date.now();
    T.status = 'running';
    keepAwake(true);
    tick(); // synchronous: the first cue is spoken inside the user's tap
  }

  function pause() {
    if (T.status !== 'running') return;
    T.acc = elapsed();
    T.status = 'paused';
    stopSpeech();
    tick();
  }

  function resetState() {
    T.status = 'idle';
    T.acc = 0;
    A.idx = -1;
    A.sec = -1;
  }

  function reset() {
    resetState();
    stopSpeech();
    keepAwake(false);
    tick();
  }

  function finish() {
    T.acc = total;
    T.status = 'done';
    keepAwake(false);
  }

  function toggle() {
    if (T.status === 'running') pause();
    else start();
  }

  function tick() {
    const e = elapsed();
    if (T.status === 'running') {
      const a = locate(Math.min(total, e + AUDIO_LEAD_MS));
      audioCues(a.idx, a.rem, e);
      if (e >= total) finish();
    }
    render(Math.min(e, total));
  }

  function audioCues(idx, rem, e) {
    const sec = ceilSec(rem);
    if (idx !== A.idx) {
      A.idx = idx;
      A.sec = sec;
      const seg = segs[idx];
      const startedAgo = seg ? e - seg.start : e - total;
      if (startedAgo <= STALE_MS) cuePhase(idx);
      return;
    }
    if (sec === A.sec) return;
    A.sec = sec;
    const seg = segs[idx];
    if (!seg || sec < 1) return;
    const limit = seg.type === 'work' ? S.countdown : seg.type === 'prep' ? Math.min(3, S.countdown) : 0;
    if (sec <= limit) cueCount(sec);
  }

  function cuePhase(idx) {
    if (idx >= segs.length) {
      if (S.phaseBeep) { beep(1046, 0.18); setTimeout(() => beep(1318, 0.4), 220); }
      speak('Workout complete. Great job!');
      return;
    }
    const seg = segs[idx];
    if (seg.type === 'work') {
      if (S.phaseBeep) beep(1320, 0.25);
      speak('Work!');
    } else if (seg.type === 'rest') {
      if (S.phaseBeep) beep(660, 0.25);
      speak('Rest!');
    } else {
      speak('Get ready');
    }
  }

  function cueCount(sec) {
    const m = S.countdownMode;
    if (m === 'beep' || m === 'both') beep(880, 0.12);
    if (m === 'voice' || m === 'both') speak(String(sec));
  }

  // ---------------------------------------------------------------- audio
  let ctx = null;
  let speechPrimed = false;

  function unlockAudio() {
    // Safari 17+: play through the silent switch like a media app.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* ignore */ }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!ctx && AC) ctx = new AC();
      if (ctx) {
        if (ctx.state !== 'running') ctx.resume();
        const b = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = b;
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch (_) { /* ignore */ }
    if (!speechPrimed && 'speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        speechSynthesis.speak(u);
        speechPrimed = true;
      } catch (_) { /* ignore */ }
    }
  }

  function beep(freq, dur) {
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') ctx.resume();
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const peak = Math.max(0.0002, 0.6 * S.volume);
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (_) { /* ignore */ }
  }

  // Voice names of common female English voices (iOS/macOS first, then Chrome/Windows).
  const FEMALE_HINTS = ['samantha', 'ava', 'allison', 'susan', 'zoe', 'karen', 'moira', 'tessa', 'fiona',
    'victoria', 'serena', 'kate', 'nicky', 'martha', 'catherine', 'google us english', 'zira', 'aria',
    'jenny', 'female'];
  let voices = [];

  function refreshVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
    voices.sort((a, b) => femaleRank(a) - femaleRank(b) || a.name.localeCompare(b.name));
    populateVoiceSelect();
  }
  function femaleRank(v) {
    const n = v.name.toLowerCase();
    const i = FEMALE_HINTS.findIndex((h) => n.includes(h));
    return i === -1 ? 999 : i;
  }
  function pickVoice() {
    if (S.voiceURI) {
      const v = voices.find((x) => x.voiceURI === S.voiceURI);
      if (v) return v;
    }
    return voices.find((v) => femaleRank(v) < 999) || voices[0] || null;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel(); // never let cues queue up behind each other
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-US'; }
      u.rate = 1.05;
      u.pitch = 1.05;
      u.volume = S.volume;
      speechSynthesis.speak(u);
    } catch (_) { /* ignore */ }
  }
  function stopSpeech() {
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (_) { /* ignore */ }
  }

  if ('speechSynthesis' in window) {
    refreshVoices();
    try { speechSynthesis.addEventListener('voiceschanged', refreshVoices); } catch (_) {
      speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }

  // ---------------------------------------------------------------- wake lock
  let wakeLock = null;
  async function keepAwake(on) {
    if (!('wakeLock' in navigator)) return;
    try {
      if (on) {
        if (!wakeLock && document.visibilityState === 'visible') {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => { wakeLock = null; });
        }
      } else if (wakeLock) {
        const w = wakeLock;
        wakeLock = null;
        await w.release();
      }
    } catch (_) { wakeLock = null; }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (T.status === 'running' || T.status === 'paused') keepAwake(true);
      tick();
    }
  });

  // ---------------------------------------------------------------- render
  const el = {
    app: $('app'), clock: $('clock'), clockArea: $('clockArea'), badge: $('badge'),
    phase: $('phaseLabel'), roundNow: $('roundNow'), totalLeft: $('totalLeft'),
    roundsLeft: $('roundsLeft'), nextLabel: $('nextLabel'), nextTime: $('nextTime'),
    progress: $('progressFill'),
  };
  const LABEL = { prep: 'GET READY', work: 'WORK', rest: 'REST', done: 'DONE' };
  const COLOR = { prep: 'var(--prep)', work: 'var(--work)', rest: 'var(--rest)', done: 'var(--done)' };
  const last = {};

  function set(key, node, prop, value) {
    if (last[key] === value) return false;
    last[key] = value;
    node[prop] = value;
    return true;
  }

  function clockHTML(str) {
    return str.split('').map((ch) => (ch === ':' ? '<span class="c">:</span>' : `<span class="d">${ch}</span>`)).join('');
  }

  function render(e) {
    const { idx, rem } = locate(e);
    const seg = segs[idx];
    const type = seg ? seg.type : 'done';
    const sec = seg ? ceilSec(rem) : 0;
    const clockStr = fmt(sec);

    set('cls', el.app, 'className', [
      `phase-${type}`,
      `status-${T.status}`,
      T.status === 'running' && type === 'work' && sec <= S.countdown ? 'final' : '',
    ].join(' ').trim());

    if (set('clock', el.clock, 'innerHTML', clockHTML(clockStr))) {
      if (last.clockLen !== clockStr.length) { last.clockLen = clockStr.length; fitClock(); }
    }
    set('phase', el.phase, 'textContent', LABEL[type]);

    const workDone = segs.filter((s) => s.type === 'work' && s.start + s.dur <= e).length;
    const roundsLeft = S.rounds - workDone;
    const curRound = seg ? seg.round : S.rounds;
    set('round', el.roundNow, 'textContent', `${curRound}/${S.rounds}`);
    set('rleft', el.roundsLeft, 'textContent', String(roundsLeft));
    set('total', el.totalLeft, 'textContent', fmt(ceilSec(total - e)));

    const next = seg ? segs[idx + 1] : null;
    const nType = next ? next.type : 'done';
    set('nlabel', el.nextLabel, 'textContent', next ? LABEL[nType] : (seg ? 'FINISH' : '—'));
    set('ntime', el.nextTime, 'textContent', next ? fmt(next.dur / 1000) : '');
    if (last.ncolor !== nType) { last.ncolor = nType; el.nextLabel.style.color = COLOR[nType]; }

    const frac = seg ? 1 - rem / seg.dur : 1;
    el.progress.style.width = `${(frac * 100).toFixed(2)}%`;

    const badge = { idle: 'TAP TO START', paused: 'PAUSED · TAP TO RESUME', done: 'DONE · TAP TO GO AGAIN', running: '' }[T.status];
    set('badge', el.badge, 'textContent', badge);
  }

  // Size the digits to fill the clock area (height-limited in landscape,
  // width-limited in portrait).
  function fitClock() {
    const area = el.clockArea;
    const cs = getComputedStyle(area);
    const w = (area.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * 0.96;
    const h = area.clientHeight * 0.92;
    if (w <= 0 || h <= 0) return;
    el.clock.style.fontSize = '100px';
    const perPx = el.clock.offsetWidth / 100;
    const size = Math.min(w / perPx, h / 0.84);
    el.clock.style.fontSize = `${Math.floor(size)}px`;
  }

  if ('ResizeObserver' in window) new ResizeObserver(fitClock).observe(el.clockArea);
  window.addEventListener('resize', fitClock);
  window.addEventListener('orientationchange', () => setTimeout(fitClock, 250));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitClock);

  // ---------------------------------------------------------------- toast
  let toastTimer = 0;
  function toast(msg, ms = 1800) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------------------------------------------------------------- controls
  const btnReset = $('btnReset');
  let resetArmed = 0;

  function onReset() {
    const midWorkout = T.status === 'running' || T.status === 'paused';
    if (midWorkout && !resetArmed) {
      btnReset.classList.add('armed');
      toast('Tap ↻ again to restart');
      resetArmed = setTimeout(disarm, 2500);
      return;
    }
    disarm();
    reset();
    toast('Restarted', 900);
  }
  function disarm() {
    clearTimeout(resetArmed);
    resetArmed = 0;
    btnReset.classList.remove('armed');
  }

  $('btnPlay').addEventListener('click', toggle);
  $('btnPlayBig').addEventListener('click', toggle);
  el.clockArea.addEventListener('click', toggle);
  btnReset.addEventListener('click', onReset);
  $('btnSettings').addEventListener('click', openSettings);

  document.addEventListener('keydown', (ev) => {
    if (!$('settings').hidden) {
      if (ev.key === 'Escape') closeSettings();
      return;
    }
    if (ev.code === 'Space' || ev.key === 'Enter') { ev.preventDefault(); toggle(); }
    else if (ev.key === 'r' || ev.key === 'R') onReset();
  });

  // ---------------------------------------------------------------- settings UI
  const sheet = $('settings');
  const NUM_KEYS = ['work', 'rest', 'rounds', 'prep', 'countdown'];
  const f = (k) => $(`f-${k}`);

  function fillForm(src) {
    for (const k of NUM_KEYS) f(k).value = src[k];
    f('countdownMode').value = src.countdownMode;
    f('phaseBeep').checked = !!src.phaseBeep;
    f('volume').value = src.volume;
    f('voice').value = src.voiceURI || '';
    updateSummary();
  }

  function readForm() {
    const s = { ...S };
    for (const k of NUM_KEYS) s[k] = clampInt(f(k).value, LIMITS[k], S[k]);
    s.countdownMode = f('countdownMode').value;
    s.phaseBeep = f('phaseBeep').checked;
    s.volume = Math.min(1, Math.max(0.1, Number(f('volume').value) || 1));
    s.voiceURI = f('voice').value;
    return s;
  }

  function updateSummary() {
    const s = readForm();
    const totalSec = s.prep + s.rounds * s.work + (s.rounds - 1) * s.rest;
    $('summary').innerHTML = `${s.rounds} × (${fmt(s.work)} work + ${fmt(s.rest)} rest) — total <b>${fmt(totalSec)}</b>` +
      (s.prep ? ` incl. ${s.prep}s get-ready` : '');
  }

  function populateVoiceSelect() {
    const sel = $('f-voice');
    const current = sel.value || S.voiceURI;
    sel.innerHTML = '<option value="">Auto (female)</option>' + voices.map((v) =>
      `<option value="${v.voiceURI.replace(/"/g, '&quot;')}">${v.name.replace(/</g, '&lt;')} (${v.lang})</option>`).join('');
    sel.value = voices.some((v) => v.voiceURI === current) ? current : '';
  }

  function openSettings() {
    if (T.status === 'running') pause();
    refreshVoices();
    fillForm(S);
    sheet.hidden = false;
  }
  function closeSettings() { sheet.hidden = true; }

  sheet.addEventListener('click', (ev) => { if (ev.target === sheet) closeSettings(); });
  $('btnClose').addEventListener('click', closeSettings);

  sheet.querySelectorAll('.stepper button').forEach((b) => {
    b.addEventListener('click', () => {
      const key = b.closest('.row').dataset.key;
      const input = f(key);
      input.value = clampInt(Number(input.value || 0) + Number(b.dataset.d), LIMITS[key], DEFAULTS[key]);
      updateSummary();
    });
  });
  sheet.querySelectorAll('input, select').forEach((i) => i.addEventListener('input', updateSummary));

  $('btnDefaults').addEventListener('click', () => fillForm(DEFAULTS));

  $('btnTest').addEventListener('click', () => {
    unlockAudio();
    const prev = S;
    S = readForm();
    if (S.phaseBeep) beep(1320, 0.25);
    speak('Work! 5, 4, 3, 2, 1. Rest!');
    S = prev;
  });

  $('btnSave').addEventListener('click', () => {
    const next = readForm();
    const timingChanged = NUM_KEYS.some((k) => next[k] !== S[k]);
    S = next;
    saveSettings();
    closeSettings();
    if (timingChanged) {
      buildSchedule();
      reset();
      toast('Saved · timer reset');
    } else {
      toast('Saved', 900);
    }
  });

  // ---------------------------------------------------------------- boot
  buildSchedule();
  tick();
  fitClock();
  setInterval(tick, 100);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
