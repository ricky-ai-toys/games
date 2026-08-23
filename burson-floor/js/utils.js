/* Utilities */

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

  worldCenter(tx, ty) {
    return {
      x: (tx + 0.5) * CONST.TILE,
      y: (ty + 0.5) * CONST.TILE,
    };
  },

  rand(a, b) {
    return a + Math.random() * (b - a);
  },

  randInt(a, b) {
    return Math.floor(Utils.rand(a, b + 1));
  },

  pick(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  },

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  formatTime(mins) {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  },

  // Simple hash for stable colors from string
  hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  },
};
