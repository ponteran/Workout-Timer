(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- settings
  const DEFAULTS = {
    work: 60,            // seconds
    rest: 5,             // seconds
    restChange: 5,       // rest before an exercise in a different position
    rounds: 30,
    prep: 5,             // "get ready" lead-in before round 1 (0 = off)
    countdown: 5,        // spoken countdown during the last N seconds of work
    countdownMode: 'voice', // voice | beep | both | off
    phaseBeep: true,     // short tone together with "Work!" / "Rest!"
    voice: 'coach',      // recorded set (coach | coach-uk | warm), 'auto' = system female voice, or a system voiceURI
    tick: true,          // subtle clock tick every second
    useRoutine: true,    // follow the exercise list (one exercise per round)
    routineText: (window.Routine && Routine.DEFAULT_TEXT) || '',
    rv: 4,               // settings revision (for migrations)
    audioMode: 'exclusive', // 'exclusive' = media app (plays in silent mode) | 'mix' = plays over other apps' audio
    volume: 1,
  };
  const LIMITS = { work: [1, 3600], rest: [0, 3600], restChange: [0, 3600], rounds: [1, 99], prep: [0, 60], countdown: [0, 10] };
  const STORE_KEY = 'workoutTimer.settings.v1';

  // Speech engines start talking ~100-300 ms after speak() is called, so audio
  // cues are fired slightly early to land on the second boundary.
  const LEAD_CLIPS_MS = 40;
  const LEAD_SPEECH_MS = 150;
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
    if (!s.voice || s.voice === 'clips') s.voice = DEFAULTS.voice; // migrate older settings
    delete s.voiceURI;
    if (!saved.rv && typeof s.routineText === 'string') {
      // rev 2: Hamstring PNF got its relax/extend intervals
      s.routineText = s.routineText.replace(
        /^(\s*2\s*\|\s*Supine\s*\|\s*Hamstring PNF — BILATERAL 3 cycles)\s*$/m, '$1 | relax 10, extend 30');
    }
    if ((saved.rv || 1) < 3) {
      // rev 3: position changes back to a 5 s rest (except before Couch
      // stretch LEFT), 40 s for bird dog / cat-cow / world's greatest stretch.
      if (saved.restChange === 10) s.restChange = 5;
      if (typeof s.routineText === 'string') {
        s.routineText = s.routineText
          .replace(/^\s*1(\s*\|\s*Quadruped\s*\|\s*Bird dog)\s*$/m, '40s$1')
          .replace(/^\s*1(\s*\|\s*Quadruped\s*\|\s*Cat-cow)\s*$/m, '40s$1')
          .replace(/^\s*1(\s*\|\s*Standing\s*\|\s*World's greatest stretch)\s*$/m, '40s$1')
          .replace(/^(\s*1\s*\|\s*Kneeling\s*\|\s*Couch stretch LEFT)\s*$/m, '$1 | rest before 10');
      }
    }
    if ((saved.rv || 1) < 4 && typeof s.routineText === 'string') {
      // rev 4: "Switch!" halfway through plank / bird dog / world's greatest stretch
      s.routineText = s.routineText
        .replace(/^(\s*\S+\s*\|\s*Prone\s*\|\s*Plank, alternating leg lift)\s*$/m, '$1 | switch')
        .replace(/^(\s*\S+\s*\|\s*Quadruped\s*\|\s*Bird dog)\s*$/m, '$1 | switch')
        .replace(/^(\s*\S+\s*\|\s*Standing\s*\|\s*World's greatest stretch)\s*$/m, '$1 | switch');
    }
    if (s.audioMode !== 'mix') s.audioMode = 'exclusive';
    s.rv = DEFAULTS.rv;
    return s;
  }
  function saveSettings() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (_) { /* ignore */ }
  }

  let S = loadSettings();

  // ---------------------------------------------------------------- schedule
  let segs = [];
  let total = 0;
  let routine = [];   // [{min, position, name}] when the exercise list is on

  const parseRoutine = (s) => (s.useRoutine && window.Routine ? Routine.parse(s.routineText) : []);
  const roundCount = () => routine.length || S.rounds;

  // Each segment: {type, dur, start, round, ex, last, sub, change}.
  //  - work: `ex` is the exercise being done. An exercise with intervals
  //    ("relax 10, extend 30") becomes several work segments, each with
  //    `sub` = {label, step, cycle, cycles}; `last` marks its final one.
  //  - rest/prep: `ex` is the exercise coming up next; `change` = the next
  //    exercise is in a different position (longer rest).
  const samePos = (a, b) => !a || !b || !a.position || !b.position ||
    a.position.trim().toLowerCase() === b.position.trim().toLowerCase();

  function makeSchedule(s) {
    const items = parseRoutine(s);
    const n = items.length || s.rounds;
    const out = [];
    let t = 0;
    const add = (type, sec, round, ex, extra) => {
      if (sec <= 0) return;
      out.push(Object.assign({ type, dur: sec * 1000, start: t, round, ex: ex || null, last: true }, extra));
      t += sec * 1000;
    };
    add('prep', s.prep, 1, items[0]);
    for (let r = 1; r <= n; r++) {
      const ex = items[r - 1];
      const workSec = ex && ex.sec ? ex.sec : Math.max(1, Math.round(s.work * (ex ? ex.min : 1)));
      if (ex && ex.steps && ex.steps.length) {
        const cycleSec = ex.steps.reduce((a, st) => a + st.sec, 0);
        const cycles = Math.ceil(workSec / cycleSec);
        let left = workSec;
        let cycle = 1;
        let i = 0;
        while (left > 0) {
          const st = ex.steps[i];
          const d = Math.min(st.sec, left);
          left -= d;
          add('work', d, r, ex, { sub: { label: st.label, step: i, cycle, cycles }, last: left <= 0 });
          if (++i >= ex.steps.length) { i = 0; cycle++; }
        }
      } else if (ex && ex.sides && workSec >= 2) {
        // "switch": two halves, "Switch!" at the midpoint
        const half = Math.floor(workSec / 2);
        add('work', half, r, ex, { sub: { label: 'work', side: 1 }, last: false });
        add('work', workSec - half, r, ex, { sub: { label: 'switch', side: 2 } });
      } else {
        add('work', workSec, r, ex);
      }
      if (r < n) {                                   // no rest after the final round
        const next = items[r];
        const change = !!(ex && next && !samePos(ex, next));
        const custom = next && next.restBefore != null;   // "rest before 10" on that line
        add('rest', custom ? next.restBefore : change ? s.restChange : s.rest, r, next, { change, custom });
      }
    }
    return { segs: out, total: t, routine: items };
  }

  function buildSchedule() {
    const sc = makeSchedule(S);
    segs = sc.segs;
    total = sc.total;
    routine = sc.routine;
  }

  // How many seconds are counted down at the end of a segment.
  function countLimit(seg) {
    if (!seg) return 0;
    if (seg.type === 'prep') return Math.min(3, S.countdown);
    if (seg.type === 'work') return seg.last ? S.countdown : Math.min(3, S.countdown);
    return 0;
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
    lastTickAt = -1;
  }

  function reset() {
    resetState();
    stopSpeech();
    keepAwake(false);
    stopKeepAlive();
    audioSuspect = false;
    tick();
  }

  function finish() {
    T.acc = total;
    T.status = 'done';
    keepAwake(false);
    setTimeout(() => { if (T.status === 'done') stopKeepAlive(); }, 4000);
  }

  function toggle() {
    if (T.status === 'running') pause();
    else start();
  }

  function tick() {
    const e = elapsed();
    if (T.status === 'running') {
      const lead = isClipVoice(S.voice) ? LEAD_CLIPS_MS : LEAD_SPEECH_MS;
      const a = locate(Math.min(total, e + lead));
      audioCues(a.idx, a.rem, e);
      scheduleTick(e);
      audioWatchdog();
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
    if (sec <= countLimit(seg)) cueCount(sec);
  }

  function cuePhase(idx) {
    stopVoice(); // a new phase always cuts off whatever is still being said
    const beepFirst = S.phaseBeep;
    const gap = beepFirst ? 0.16 : 0; // let the beep finish before the word
    if (idx >= segs.length) {
      if (beepFirst) { beep(1046, 0.14); setTimeout(() => beep(1318, 0.3), 160); }
      say('complete', 'Workout complete. Great job!', beepFirst ? 0.5 : 0);
      return;
    }
    const seg = segs[idx];
    if (seg.type === 'work' && seg.sub && seg.sub.side === 2) {
      // Halfway through a two-sided exercise
      if (beepFirst) beep(1320, 0.14);
      say(cueClip('switch'), 'Switch!', gap);
    } else if (seg.type === 'work' && seg.sub && !seg.sub.side) {
      // Interval inside an exercise, e.g. "Relax." / "Extend!"
      if (beepFirst) beep(seg.sub.step % 2 ? 1320 : 990, 0.14);
      say(cueClip(seg.sub.label), `${seg.sub.label}!`, gap);
    } else if (seg.type === 'work') {
      if (beepFirst) beep(1320, 0.14);
      say('work', 'Work!', gap);
    } else if (seg.type === 'rest') {
      if (beepFirst) beep(660, 0.14);
      // "Rest! Next: glute bridge, left." – announced during the transition;
      // the new position is named too when it changes ("Next: prone. …").
      const parts = [['rest', 'Rest!']];
      if (seg.ex) {
        parts.push(['next', 'Next:']);
        if (seg.change) parts.push(posPart(seg.ex));
        parts.push(exPart(seg.ex));
      }
      sayChain(parts, gap);
    } else {
      sayChain([['ready', 'Get ready.']].concat(seg.ex ? [['first', 'First up:'], exPart(seg.ex)] : []), 0);
    }
  }

  function cueCount(sec) {
    const m = S.countdownMode;
    if (m === 'beep' || m === 'both') beep(880, 0.1);
    if (m === 'voice' || m === 'both') {
      // Don't talk over an exercise announcement that is still playing.
      if (voiceBusy()) { if (m === 'voice') beep(880, 0.1); return; }
      say(String(sec), String(sec), m === 'both' ? 0.12 : 0);
    }
  }

  // ---------------------------------------------------------------- audio
  // Primary path: short pre-recorded voice clips (audio/*.mp3) decoded into
  // Web Audio buffers. Once the AudioContext is unlocked by a tap, iOS plays
  // these reliably (also in Home Screen mode). The browser's speech engine
  // (speechSynthesis) is only a fallback / optional alternative.
  const CLIPS = ['work', 'rest', 'ready', 'complete', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const CLIP_SETS = {
    coach: 'Coach – firm (US)',
    'coach-uk': 'Coach – firm (British)',
    warm: 'Warm (US)',
  };
  const isClipVoice = (v) => Object.prototype.hasOwnProperty.call(CLIP_SETS, v);
  const buffers = {};   // buffers[set][clip]
  const loading = {};   // loading[set] = Promise
  let ctx = null;
  let master = null;
  let speechPrimed = false;
  let keepAlive = null; // looping silent <audio>: puts iOS in "playback" mode (ignores silent switch)

  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = S.volume;
      master.connect(ctx.destination);
      watchContext();
      loadClips(S.voice);
    } catch (_) { ctx = null; }
    return ctx;
  }

  function decode(buf) {
    return new Promise((resolve, reject) => {
      // Older Safari only supports the callback form.
      const p = ctx.decodeAudioData(buf, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
  }

  function loadClip(set, name) {
    const key = `${set}/${name}`;
    if (loading[key]) return loading[key];
    const b = buffers[set] = buffers[set] || {};
    loading[key] = fetch(`audio/${key}.mp3`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(decode)
      .then((buf) => { b[name] = buf; })
      .catch(() => { delete loading[key]; /* falls back to speechSynthesis */ });
    return loading[key];
  }

  // Exercise names that have a pre-recorded clip (audio/exercises.json).
  let exManifest = null;
  function exAvailable() {
    if (!exManifest) {
      exManifest = fetch('audio/exercises.json')
        .then((r) => (r.ok ? r.json() : []))
        .then((a) => new Set(a))
        .catch(() => { exManifest = null; return new Set(); });
    }
    return exManifest;
  }
  const exSpoken = (ex) => Routine.spoken(ex.name);
  const exClip = (ex) => `ex/${Routine.slug(exSpoken(ex))}`;
  const exPart = (ex) => [exClip(ex), exSpoken(ex)];
  const posPart = (ex) => [`pos/${Routine.slug(ex.position)}`, `${ex.position}.`];
  const cueClip = (label) => `cue/${Routine.slug(label)}`;

  function loadClips(set) {
    if (!isClipVoice(set) || !ctx) return Promise.resolve();
    const base = Promise.all([...CLIPS, 'next', 'first'].map((n) => loadClip(set, n)));
    const items = routine.slice();
    const names = exAvailable().then((av) => Promise.all(items
      .filter((ex) => av.has(exClip(ex).slice(3)))
      .map((ex) => loadClip(set, exClip(ex)))));
    const extra = new Set();
    items.forEach((ex) => {
      if (ex.position) extra.add(posPart(ex)[0]);
      (ex.steps || []).forEach((st) => extra.add(cueClip(st.label)));
      if (ex.sides) extra.add(cueClip('switch'));
    });
    const more = Promise.all([...extra].map((n) => loadClip(set, n)));
    return Promise.all([base, names, more]);
  }
  const clipCount = (set) => CLIPS.filter((c) => buffers[set] && buffers[set][c]).length;
  const exClipCount = (set) => routine.filter((ex) => buffers[set] && buffers[set][exClip(ex)]).length;

  // Safari 16.4+ Audio Session API.
  //  exclusive -> 'playback': like a media app; plays with the silent switch
  //               on, but another app starting audio interrupts us.
  //  mix       -> 'ambient': mixes with music/podcasts and isn't interrupted
  //               by them, but the silent switch mutes it.
  function applySessionType() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = S.audioMode === 'mix' ? 'ambient' : 'playback';
    } catch (_) { /* ignore */ }
  }

  function unlockAudio() {
    applySessionType();
    if (S.audioMode === 'mix') {
      // A playing <audio> element would claim the audio session for itself.
      if (keepAlive && !keepAlive.paused) { ownPause = true; keepAlive.pause(); }
    } else {
      startKeepAlive();
    }
    const c = ensureContext();
    if (c) {
      try {
        if (c.state !== 'running') c.resume();
        const src = c.createBufferSource();
        src.buffer = c.createBuffer(1, 1, 22050);
        src.connect(c.destination);
        src.start(0);
      } catch (_) { /* ignore */ }
    }
    if (!speechPrimed && 'speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        speechSynthesis.speak(u);
        speechPrimed = true;
      } catch (_) { /* ignore */ }
    }
  }

  let ownPause = false;
  function startKeepAlive() {
    if (!keepAlive) {
      try {
        keepAlive = new Audio('audio/silence.mp3');
        keepAlive.loop = true;
        keepAlive.setAttribute('playsinline', '');
        keepAlive.volume = 0.01;
        // Paused by iOS (not by us) = another app took the audio session.
        keepAlive.addEventListener('pause', () => {
          if (!ownPause) markInterrupted();
          ownPause = false;
        });
      } catch (_) { keepAlive = null; }
    }
    if (keepAlive && keepAlive.paused) keepAlive.play().catch(() => {});
  }
  function stopKeepAlive() {
    if (keepAlive && !keepAlive.paused) { ownPause = true; keepAlive.pause(); }
  }

  // ---- recovering from interruptions -----------------------------------
  // When another app plays audio (or a call / Siri / alarm happens), iOS
  // takes the audio session away. Afterwards the AudioContext may stay
  // "interrupted"/"suspended", or even report "running" while its clock is
  // frozen and nothing is heard. We try to resume on our own; if iOS
  // insists on a tap, a banner asks for one and the tap rebuilds the
  // audio engine (decoded clips are reused, so nothing is re-downloaded).
  let audioSuspect = false;
  let lastHeal = 0;
  let clockCheck = null;
  let badSince = 0;

  const workoutActive = () => T.status === 'running' || T.status === 'paused';
  function markInterrupted() { if (workoutActive()) audioSuspect = true; }

  function audioBad() {
    return !!ctx && (ctx.state !== 'running' || audioSuspect);
  }

  function rebuildContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const old = ctx;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = S.volume;
      master.connect(ctx.destination);
      watchContext();
    } catch (_) { ctx = old; return; }
    activeVoice.clear();
    voiceBusyUntil = 0;
    if (old) { try { old.close(); } catch (_) { /* ignore */ } }
  }

  // Must be called from a tap.
  function restoreAudio() {
    if (!ctx || ctx.state !== 'running' || audioSuspect) rebuildContext();
    audioSuspect = false;
    clockCheck = null;
    badSince = 0;
    unlockAudio();
  }

  // Runs with the UI timer (no tap available): detect and auto-heal.
  function audioWatchdog() {
    if (T.status !== 'running' || !ctx) { clockCheck = null; return; }
    const now = Date.now();
    if (ctx.state === 'running') {
      if (!clockCheck) clockCheck = { c: ctx.currentTime, w: now };
      else if (now - clockCheck.w >= 2000) {
        const advanced = (ctx.currentTime - clockCheck.c) * 1000;
        const sessionInterrupted = !!navigator.audioSession && navigator.audioSession.state === 'interrupted';
        if (advanced < (now - clockCheck.w) * 0.5 || sessionInterrupted) audioSuspect = true; // frozen clock
        else if (S.audioMode === 'mix' || (keepAlive && !keepAlive.paused)) audioSuspect = false; // healed
        clockCheck = { c: ctx.currentTime, w: now };
      }
    } else {
      clockCheck = null;
    }
    if (audioBad() && now - lastHeal > 1500) {
      lastHeal = now;
      applySessionType();
      try { ctx.resume().catch(() => {}); } catch (_) { /* ignore */ }
      if (S.audioMode !== 'mix') startKeepAlive();
    }
  }

  function watchContext() {
    if (!ctx) return;
    try {
      // A suspended/interrupted context is caught by audioBad() directly;
      // here we only restart the clock check once it runs again.
      ctx.addEventListener('statechange', () => { clockCheck = null; });
    } catch (_) { /* ignore */ }
  }
  try {
    if (navigator.audioSession) {
      navigator.audioSession.addEventListener('statechange', () => {
        if (navigator.audioSession.state === 'interrupted') markInterrupted();
      });
    }
  } catch (_) { /* ignore */ }

  // Any touch re-unlocks audio (iOS suspends/interrupts the context after
  // calls, Siri, locking the screen, switching apps…).
  // A tap that restores sound must not also pause the workout. On iOS the
  // "click" arrives when the finger lifts – after the banner has already
  // disappeared – so it would land on the clock underneath (tap = pause).
  // The restoring tap's click is therefore swallowed.
  let swallowTapUntil = 0;
  const tapSwallowed = () => Date.now() < swallowTapUntil;

  document.addEventListener('pointerdown', () => {
    if (!ctx) return;
    if (workoutActive() && audioBad()) {
      restoreAudio();
      swallowTapUntil = Date.now() + 1000;
      toast('Sound restored', 1200);
    } else if (ctx.state !== 'running') {
      unlockAudio();
    }
  }, { passive: true, capture: true });

  const activeVoice = new Set();
  let voiceBusyUntil = 0; // audio-clock time when the current announcement ends

  // Plays a recorded clip; returns its duration in seconds, or false.
  function playBuffer(name, delay) {
    const buf = buffers[S.voice] && buffers[S.voice][name];
    if (!ctx || !buf) return false;
    try {
      if (ctx.state !== 'running') ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(master);
      const at = ctx.currentTime + (delay || 0);
      src.start(at);
      activeVoice.add(src);
      src.onended = () => activeVoice.delete(src);
      voiceBusyUntil = Math.max(voiceBusyUntil, at + buf.duration);
      if (window.__wtLog) window.__wtLog(name);
      return buf.duration;
    } catch (_) { return false; }
  }

  // (+0.3 s tail so a tick never lands right on the end of a word)
  const voiceBusy = (inSec = 0) => !!ctx && ctx.currentTime + inSec < voiceBusyUntil + 0.3;

  function stopVoice() {
    activeVoice.forEach((src) => { try { src.stop(); } catch (_) { /* ignore */ } });
    activeVoice.clear();
    voiceBusyUntil = 0;
    stopSpeech();
  }

  function speakLater(text, delaySec) {
    if (delaySec > 0) setTimeout(() => speak(text), delaySec * 1000);
    else speak(text);
  }

  // Say several parts back to back: [[clipName, fallbackText], ...].
  // Parts without a recorded clip (e.g. an exercise you added yourself) are
  // spoken by the iPhone's speech engine instead.
  function sayChain(parts, delay = 0) {
    let t = delay;
    if (isClipVoice(S.voice)) {
      for (let i = 0; i < parts.length; i++) {
        const d = playBuffer(parts[i][0], t);
        if (d === false) { speakLater(parts.slice(i).map((p) => p[1]).join(' '), t); return; }
        t += d + 0.08;
      }
      return;
    }
    speakLater(parts.map((p) => p[1]).join(' '), t);
  }

  function say(clip, text, delay) { sayChain([[clip, text]], delay || 0); }

  // ---- ticking: a short band-passed noise click, alternating "tick"/"tock".
  // Scheduled on the audio clock just ahead of each second boundary so it
  // stays perfectly even (the UI timer only runs every ~100 ms).
  let noise = null;
  let lastTickAt = -1;
  let tickParity = 0;

  function playTick(delaySec, high) {
    if (!ctx) return;
    try {
      if (!noise) {
        const len = Math.floor(ctx.sampleRate * 0.03);
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len / 6));
      }
      const t = ctx.currentTime + Math.max(0, delaySec);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = high ? 3400 : 2600;
      bp.Q.value = 6;
      const g = ctx.createGain();
      g.gain.value = 0.9;
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start(t);
      if (window.__wtLog) window.__wtLog('tick');
    } catch (_) { /* ignore */ }
  }

  function scheduleTick(e) {
    if (!S.tick || !ctx) return;
    const at = (Math.floor(e / 1000) + 1) * 1000; // next whole-second boundary
    if (at === lastTickAt || at - e > 200 || at >= total) return;
    lastTickAt = at;
    // Stay quiet where a voice cue or beep already marks the second.
    const { idx, rem } = locate(at + 1);
    const prev = locate(at - 1);
    if (idx !== prev.idx) return;                       // phase change: "Work!" / "Rest!"
    const seg = segs[idx];
    const sec = ceilSec(rem);
    if (S.countdownMode !== 'off' && sec <= countLimit(seg)) return; // countdown "5…1"
    if (voiceBusy((at - e) / 1000)) return;                // exercise announcement
    tickParity ^= 1;
    playTick((at - e) / 1000, tickParity === 1);
  }

  function beep(freq, dur) {
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') ctx.resume();
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (_) { /* ignore */ }
  }

  // Female English voices of the system speech engine (fallback path).
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
    if (!isClipVoice(S.voice) && S.voice !== 'auto') {
      const v = voices.find((x) => x.voiceURI === S.voice);
      if (v) return v;
    }
    return voices.find((v) => femaleRank(v) < 999) || voices[0] || null;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
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
    try { if ('speechSynthesis' in window && speechSynthesis.speaking) speechSynthesis.cancel(); } catch (_) { /* ignore */ }
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
      if (T.status === 'running' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
      tick();
    }
  });

  // ---------------------------------------------------------------- render
  const el = {
    app: $('app'), clock: $('clock'), clockArea: $('clockArea'), badge: $('badge'),
    phase: $('phaseLabel'), roundNow: $('roundNow'), totalLeft: $('totalLeft'),
    roundsLeft: $('roundsLeft'), nextLabel: $('nextLabel'), nextTime: $('nextTime'),
    progress: $('progressFill'),
    exTag: $('exTag'), exPos: $('exPos'), exName: $('exName'),
  };
  const LABEL = { prep: 'GET READY', work: 'WORK', rest: 'REST', done: 'DONE' };
  const COLOR = { prep: 'var(--prep)', work: 'var(--work)', rest: 'var(--rest)', done: 'var(--done)' };
  const last = {};
  const segLabel = (seg, header) => {
    if (!seg) return LABEL.done;
    if (seg.sub && seg.sub.side) return header ? LABEL.work : seg.sub.side === 2 ? 'SWITCH' : LABEL.work;
    return seg.sub ? seg.sub.label.toUpperCase() : LABEL[seg.type];
  };

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
      T.status === 'running' && type === 'work' && sec <= countLimit(seg) ? 'final' : '',
      seg && seg.sub && !seg.sub.side ? `sub-${seg.sub.step % 2}` : '',
      routine.length ? 'has-routine' : '',
    ].join(' ').trim());

    if (routine.length) {
      const ex = seg && seg.ex;
      let tag = '';
      if (seg && type === 'work') tag = !seg.sub ? '' : seg.sub.side ? `SIDE ${seg.sub.side}/2` : `CYCLE ${seg.sub.cycle}/${seg.sub.cycles}`;
      else if (seg) tag = type === 'prep' ? 'FIRST UP' : seg.change ? 'NEW POSITION' : 'UP NEXT';
      set('exTag', el.exTag, 'textContent', tag);
      set('exPos', el.exPos, 'textContent', ex ? ex.position.toUpperCase() : '');
      set('exName', el.exName, 'textContent', ex ? ex.name : seg ? '' : 'Workout complete — great job!');
    }

    if (set('clock', el.clock, 'innerHTML', clockHTML(clockStr))) {
      if (last.clockLen !== clockStr.length) { last.clockLen = clockStr.length; fitClock(); }
    }
    set('phase', el.phase, 'textContent', segLabel(seg, true));

    const workDone = segs.filter((s) => s.type === 'work' && s.last && s.start + s.dur <= e).length;
    const n = roundCount();
    const roundsLeft = n - workDone;
    const curRound = seg ? seg.round : n;
    set('round', el.roundNow, 'textContent', `${curRound}/${n}`);
    set('rleft', el.roundsLeft, 'textContent', String(roundsLeft));
    set('total', el.totalLeft, 'textContent', fmt(ceilSec(total - e)));

    const next = seg ? segs[idx + 1] : null;
    const nType = next ? next.type : 'done';
    set('nlabel', el.nextLabel, 'textContent', next ? segLabel(next) : (seg ? 'FINISH' : '—'));
    set('ntime', el.nextTime, 'textContent', next ? fmt(next.dur / 1000) : '');
    const nColor = next && next.sub && !next.sub.side && next.sub.step % 2 === 0 ? 'var(--sub)' : COLOR[nType];
    if (last.ncolor !== nColor) { last.ncolor = nColor; el.nextLabel.style.color = nColor; }

    const frac = seg ? 1 - rem / seg.dur : 1;
    el.progress.style.width = `${(frac * 100).toFixed(2)}%`;

    const badge = { idle: 'TAP TO START', paused: 'PAUSED · TAP TO RESUME', done: 'DONE · TAP TO GO AGAIN', running: '' }[T.status];
    set('badge', el.badge, 'textContent', badge);

    // "Sound interrupted" banner: only after audio has been bad for >1 s.
    const bad = T.status === 'running' && audioBad();
    if (bad && !badSince) badSince = Date.now();
    if (!bad) badSince = 0;
    const showBanner = bad && Date.now() - badSince > 1000;
    if (last.banner !== showBanner) { last.banner = showBanner; $('soundBanner').hidden = !showBanner; }
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

  $('soundBanner').addEventListener('click', (ev) => {
    ev.stopPropagation(); // don't pause the workout
    if (audioBad()) { restoreAudio(); toast('Sound restored', 1200); }
  });

  $('btnPlay').addEventListener('click', toggle);
  $('btnPlayBig').addEventListener('click', toggle);
  el.clockArea.addEventListener('click', () => {
    if (tapSwallowed()) return; // this tap was used to restore sound
    toggle();
  });
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
  const NUM_KEYS = ['work', 'rest', 'restChange', 'rounds', 'prep', 'countdown'];
  const f = (k) => $(`f-${k}`);

  function fillForm(src) {
    for (const k of NUM_KEYS) f(k).value = src[k];
    f('countdownMode').value = src.countdownMode;
    f('phaseBeep').checked = !!src.phaseBeep;
    f('volume').value = src.volume;
    f('voice').value = src.voice || DEFAULTS.voice;
    if (!f('voice').value) f('voice').value = DEFAULTS.voice;
    f('tick').checked = !!src.tick;
    f('audioMode').value = src.audioMode === 'mix' ? 'mix' : 'exclusive';
    f('useRoutine').checked = !!src.useRoutine;
    f('routine').value = src.routineText || '';
    updateSummary();
  }

  function readForm() {
    const s = { ...S };
    for (const k of NUM_KEYS) s[k] = clampInt(f(k).value, LIMITS[k], S[k]);
    s.countdownMode = f('countdownMode').value;
    s.phaseBeep = f('phaseBeep').checked;
    s.volume = Math.min(1, Math.max(0.1, Number(f('volume').value) || 1));
    s.voice = f('voice').value || DEFAULTS.voice;
    s.tick = f('tick').checked;
    s.audioMode = f('audioMode').value === 'mix' ? 'mix' : 'exclusive';
    s.useRoutine = f('useRoutine').checked;
    s.routineText = f('routine').value;
    return s;
  }

  function updateSummary() {
    const s = readForm();
    const items = parseRoutine(s);
    f('rounds').disabled = items.length > 0;
    f('rounds').closest('.row').classList.toggle('disabled', items.length > 0);
    $('routineCount').textContent = s.useRoutine ? `${items.length} exercises` : 'off';
    const sc = makeSchedule(s);
    const totalSec = sc.total / 1000;
    let text;
    if (items.length) {
      const changes = sc.segs.filter((g) => g.type === 'rest' && g.change).length;
      const custom = sc.segs.filter((g) => g.type === 'rest' && g.custom).length;
      text = `${items.length} exercises · rest ${s.rest}s, ${s.restChange}s on ${changes} position changes` +
        (custom ? `, ${custom} custom` : '');
    } else {
      text = `${s.rounds} × (${fmt(s.work)} work + ${fmt(s.rest)} rest)`;
    }
    $('summary').innerHTML = `${text} — total <b>${fmt(totalSec)}</b>` + (s.prep ? ` incl. ${s.prep}s get-ready` : '');
  }

  $('btnRoutineDefault').addEventListener('click', () => {
    f('routine').value = Routine.DEFAULT_TEXT;
    f('useRoutine').checked = true;
    updateSummary();
  });

  function populateVoiceSelect() {
    const sel = $('f-voice');
    const current = sel.value || S.voice;
    sel.innerHTML = Object.entries(CLIP_SETS).map(([k, label]) => `<option value="${k}">${label}</option>`).join('') +
      '<option value="auto">iPhone voice – auto female</option>' + voices.map((v) =>
      `<option value="${v.voiceURI.replace(/"/g, '&quot;')}">${v.name.replace(/</g, '&lt;')} (${v.lang})</option>`).join('');
    sel.value = (isClipVoice(current) || current === 'auto' || voices.some((v) => v.voiceURI === current)) ? current : DEFAULTS.voice;
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
  sheet.querySelectorAll('input, select, textarea').forEach((i) => i.addEventListener('input', updateSummary));

  $('btnDefaults').addEventListener('click', () => fillForm(DEFAULTS));

  f('voice').addEventListener('change', () => loadClips(f('voice').value));

  $('btnTest').addEventListener('click', () => {
    unlockAudio();
    const form = readForm();
    if (master) master.gain.value = form.volume;
    const prev = S;
    if (isClipVoice(form.voice)) {
      loadClips(form.voice).then(() => {
        if (!ctx) return;
        S = form;
        // two ticks, then "Work!", countdown and "Rest!"
        let t = 0;
        if (form.tick) { playTick(0, true); playTick(1, false); t = 2; }
        if (form.phaseBeep) setTimeout(() => beep(1320, 0.14), t * 1000);
        const g = form.phaseBeep ? 0.16 : 0;
        [['work', 0], ['5', 1.2], ['4', 2.2], ['3', 3.2], ['2', 4.2], ['1', 5.2]]
          .forEach(([name, at]) => playBuffer(name, t + at + g));
        const firstEx = routine[0];
        sayChain([['rest', 'Rest!']].concat(firstEx ? [['next', 'Next:'], exPart(firstEx)] : []), t + 6.2 + g);
        S = prev;
        const exInfo = routine.length ? ` · exercise names ${exClipCount(form.voice)}/${routine.length}` : '';
        toast(`Audio ${ctx.state} · voice clips ${clipCount(form.voice)}/${CLIPS.length}${exInfo}`, 4000);
      });
    } else {
      S = form;
      if (form.tick) playTick(0, true);
      speak('Work! 5, 4, 3, 2, 1. Rest!');
      S = prev;
      toast(`Audio ${ctx ? ctx.state : 'unsupported'} · iPhone voice`, 3500);
    }
  });

  $('btnSave').addEventListener('click', () => {
    const next = readForm();
    const timingChanged = NUM_KEYS.some((k) => next[k] !== S[k]) ||
      next.useRoutine !== S.useRoutine || next.routineText !== S.routineText;
    S = next;
    if (master) master.gain.value = S.volume;
    applySessionType();
    if (S.audioMode === 'mix') stopKeepAlive();
    else if (workoutActive()) startKeepAlive();
    saveSettings();
    closeSettings();
    if (timingChanged) {
      buildSchedule();
      loadClips(S.voice);
      reset();
      toast('Saved · timer reset');
    } else {
      loadClips(S.voice);
      toast('Saved', 900);
    }
  });

  // ---------------------------------------------------------------- boot
  buildSchedule();
  ensureContext(); // starts suspended; preloads the voice clips
  tick();
  fitClock();
  setInterval(tick, 100);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
