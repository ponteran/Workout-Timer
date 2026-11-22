// Exercise list ("routine") support: default PT list, parser and the
// spoken form of each exercise name. Shared by the app and by the script
// that pre-records the voice clips, so both always
// agree on the exact phrase -> clip file name (audio/<voice>/ex/<slug>.mp3,
// listed in audio/exercises.json).
(function (root) {
  'use strict';

  // One exercise per line:  length | position | exercise [| options]
  // "length" = work periods (1, 2 = one 2-min block) or seconds ("40s").
  // Options (last column, comma separated, all optional):
  //   "relax 10, extend 30"  split into repeating timed parts with own cues
  //   "rest before 10"       rest before this exercise (overrides the default)
  //   "switch"               say "Switch!" halfway (change sides)
  const DEFAULT_TEXT = [
    '1 | Supine | Knee extension, roller under BOTH knees',
    '1 | Supine | Knee flexion gapping, towel, BOTH knees',
    '2 | Supine | Hamstring PNF — BILATERAL 3 cycles | relax 10, extend 30',
    '1 | Supine | Hollow body hold',
    '1 | Seated | End-range knee ext., roller under BOTH heels',
    '1 | Seated | 90-90 hip switches - 2x10 / side',
    '1 | Supine | Glute bridge LEFT',
    '1 | Supine | Glute bridge RIGHT',
    '1 | Side-lying | SLR lateral LEFT',
    '1 | Side-lying | Side plank LEFT',
    '1 | Side-lying | SLR lateral RIGHT',
    '1 | Side-lying | Side plank RIGHT',
    '1 | Prone | SLR prone LEFT',
    '1 | Prone | SLR prone RIGHT',
    '1 | Prone | Plank, alternating leg lift | switch',
    '40s | Quadruped | Bird dog | switch',
    '40s | Quadruped | Cat-cow',
    "40s | Standing | World's greatest stretch | switch",
    '1 | Kneeling | Pigeon LEFT',
    '1 | Kneeling | Pigeon RIGHT',
    '1 | Kneeling | Couch stretch LEFT | rest before 10',
    '1 | Kneeling | Couch stretch RIGHT',
    '1 | Standing | Foam stance, eyes open LEFT',
    '1 | Standing | Foam stance, eyes open RIGHT',
    '1 | Standing | Stance eyes closed LEFT',
    '1 | Standing | Stance eyes closed RIGHT',
  ].join('\n');

  // Accepts "min | position | name [| intervals]", tab-separated columns,
  // "position | name" or just "name". Blank lines and "#" comments are skipped.
  function parse(text) {
    const items = [];
    String(text || '').split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      let parts = line.split(/\s*[|\t]\s*/).map((p) => p.trim()).filter(Boolean);
      let min = 1;
      let sec = 0; // fixed length in seconds ("40s"); 0 = use min × work time
      if (parts.length > 1 && /^\d+(\.\d+)?\s*(s|sec|secs)?$/i.test(parts[0])) {
        if (/[a-z]/i.test(parts[0])) sec = Math.min(3600, Math.max(1, Math.round(parseFloat(parts[0]))));
        else min = Math.min(20, Math.max(0.25, Number(parts[0])));
        parts = parts.slice(1);
      }
      let steps = [];
      let restBefore = null;
      let sides = false;
      if (parts.length > 2) {
        let opts = parts[parts.length - 1];
        const rb = opts.match(/\brest\s+before\s*[:=]?\s*(\d+)\s*(?:s|sec|secs|seconds)?\b/i);
        if (rb) { restBefore = Math.min(3600, Number(rb[1])); opts = opts.replace(rb[0], ''); }
        const sw = /(^|,)\s*switch(\s+sides?)?\s*(?=,|$)/i;
        if (sw.test(opts)) { sides = true; opts = opts.replace(sw, '$1'); }
        steps = parseSteps(opts);
        if (rb || sides || steps.length) parts = parts.slice(0, -1);
      }
      const name = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
      const position = parts.length > 1 ? parts[0] : '';
      if (name) items.push({ min, sec, position, name, steps, restBefore, sides: sides && !steps.length });
    });
    return items;
  }

  // "relax 10, extend 30" -> [{label:'relax', sec:10}, {label:'extend', sec:30}]
  function parseSteps(text) {
    const steps = [];
    const re = /([A-Za-z][A-Za-z '’-]*?)\s*[:=]?\s*(\d+)\s*(?:s|sec|secs|seconds)?\b/g;
    let m;
    while ((m = re.exec(text))) steps.push({ label: m[1].trim().toLowerCase(), sec: Math.max(1, Number(m[2])) });
    return steps;
  }

  // Turn the written name into something a voice reads naturally.
  function spoken(name) {
    let s = String(name);
    s = s.replace(/\s*[—–]\s*/g, ', ');
    s = s.replace(/\s+-\s+/g, ', ');
    s = s.replace(/\bSLR\b/gi, 'straight leg raise');
    s = s.replace(/\bPNF\b/g, 'P N F');
    s = s.replace(/\bext\.?(?=[\s,]|$)/gi, 'extension');
    s = s.replace(/\b90-90\b/g, 'ninety-ninety');
    s = s.replace(/(\d+)\s*x\s*(\d+)\s*\/\s*side/gi, '$1 sets of $2 per side');
    s = s.replace(/\bBILATERAL\b/g, 'both sides,');
    s = s.replace(/\b[A-Z]{2,}\b/g, (w) => (w === 'P' || w === 'N' || w === 'F' ? w : w.toLowerCase()));
    s = s.replace(/([^,])\s+(left|right)$/i, '$1, $2');
    s = s.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').replace(/[\s,]+$/, '').trim();
    return s;
  }

  // File-name key for a spoken phrase.
  function slug(text) {
    return String(text).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  const api = { DEFAULT_TEXT, parse, parseSteps, spoken, slug };
  root.Routine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
