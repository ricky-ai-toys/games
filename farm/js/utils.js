/* ========================================
   Amber's Farm — Utilities
   ======================================== */

const Utils = {
  clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  tileAt(px, py) {
    return {
      tx: Math.floor(px / CONST.TILE),
      ty: Math.floor(py / CONST.TILE),
    };
  },

  rand(a, b) {
    return a + Math.random() * (b - a);
  },

  randInt(a, b) {
    return Math.floor(Utils.rand(a, b + 1));
  },

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /** Pick from [{id, w}] weighted by w — never picks undefined weights */
  weightedPick(table) {
    let total = 0;
    for (const it of table) total += it.w || 0;
    let roll = Math.random() * total;
    for (const it of table) {
      roll -= it.w || 0;
      if (roll <= 0) return it;
    }
    return table[table.length - 1];
  },

  deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  },

  formatCoins(n) {
    return Math.floor(n).toLocaleString();
  },

  seasonName(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  periodLabel(p) {
    return { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }[p] || p;
  },

  qualityStars(q) {
    if (q >= 2) return '★★';
    if (q >= 1) return '★';
    return '';
  },

  // Simple seeded RNG for map decoration
  mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
};
