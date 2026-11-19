// Exercise list ("routine") support: default PT list, parser and the
// spoken form of each exercise name. Shared by the app and by the script
// that pre-records the voice clips, so both always
// agree on the exact phrase -> clip file name (audio/<voice>/ex/<slug>.mp3,
// listed in audio/exercises.json).
(function (root) {
  'use strict';

  // One exercise per line:  minutes | position | exercise
  // "minutes" = how many work periods the exercise lasts (2 = one 2-min block).
  const DEFAULT_TEXT = [
    '1 | Supine | Knee extension, roller under BOTH knees',
    '1 | Supine | Knee flexion gapping, towel, BOTH knees',
    '2 | Supine | Hamstring PNF — BILATERAL 3 cycles',
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
    '1 | Prone | Plank, alternating leg lift',
    '1 | Quadruped | Bird dog',
    '1 | Quadruped | Cat-cow',
    "1 | Standing | World's greatest stretch",
    '1 | Kneeling | Pigeon LEFT',
    '1 | Kneeling | Pigeon RIGHT',
    '1 | Kneeling | Couch stretch LEFT',
    '1 | Kneeling | Couch stretch RIGHT',
    '1 | Standing | Foam stance, eyes open LEFT',
    '1 | Standing | Foam stance, eyes open RIGHT',
    '1 | Standing | Stance eyes closed LEFT',
    '1 | Standing | Stance eyes closed RIGHT',
  ].join('\n');

  // Accepts "min | position | name", "min<TAB>position<TAB>name",
  // "position | name" or just "name". Blank lines and "#" comments are skipped.
  function parse(text) {
    const items = [];
    String(text || '').split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      let parts = line.split(/\s*[|\t]\s*/).map((p) => p.trim()).filter(Boolean);
      let min = 1;
      if (parts.length > 1 && /^\d+(\.\d+)?$/.test(parts[0])) {
        min = Math.min(20, Math.max(0.25, Number(parts[0])));
        parts = parts.slice(1);
      }
      const name = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
      const position = parts.length > 1 ? parts[0] : '';
      if (name) items.push({ min, position, name });
    });
    return items;
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

  const api = { DEFAULT_TEXT, parse, spoken, slug };
  root.Routine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
