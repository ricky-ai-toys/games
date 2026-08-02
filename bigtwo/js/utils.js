/* ========================================
   Amber's Big Two — Utilities
   ======================================== */

const Utils = {
  clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  },

  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  pick(arr) {
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

  /** Fisher–Yates in place */
  shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /** Softmax sample from scores; temperature higher = more random */
  softmaxPick(items, scoreFn, temperature = 1) {
    if (!items.length) return null;
    if (items.length === 1) return items[0];
    const t = Math.max(0.05, temperature);
    const scores = items.map(scoreFn);
    const maxS = Math.max(...scores);
    const exps = scores.map((s) => Math.exp((s - maxS) / t));
    const sum = exps.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < items.length; i++) {
      r -= exps[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  },

  /** Pick among top-K by score with optional noise blend */
  topKPick(items, scoreFn, k, noise) {
    if (!items.length) return null;
    const ranked = items
      .map((it) => ({ it, s: scoreFn(it) }))
      .sort((a, b) => b.s - a.s);
    if (noise >= 0.99) return Utils.pick(ranked).it;
    const top = ranked.slice(0, Math.max(1, k));
    if (Math.random() < noise) {
      return Utils.pick(top).it;
    }
    return top[0].it;
  },

  loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  },

  saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota */
    }
  },

  delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  },
};
