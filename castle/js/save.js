/* Amber's Candy Castle — save data.
 * Every read and write goes through AmberHardening, which wraps them in
 * try/catch. Safari private mode throws on localStorage access, and a throw
 * during boot replaces the menu with the generic error overlay.
 */
(function (global) {
  'use strict';

  var H = global.AmberHardening;
  var KEY = 'ambers_castle_v1';

  function load() {
    if (H && H.getJSON) {
      var v = H.getJSON(KEY, null);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
      if (v === null) return { stars: {}, best: {}, endless: 0, muted: 0, seen: {} };
      /* A corrupt save is quarantined rather than allowed to wedge the game. */
      return { stars: {}, best: {}, endless: 0, muted: 0, seen: {} };
    }
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { stars: {}, best: {}, endless: 0, muted: 0, seen: {} };
      var p = JSON.parse(raw);
      return (p && typeof p === 'object') ? p : { stars: {}, best: {}, endless: 0, muted: 0, seen: {} };
    } catch (e) {
      return { stars: {}, best: {}, endless: 0, muted: 0, seen: {} };
    }
  }

  var cache = null;
  function data() { if (!cache) cache = load(); return cache; }

  function save() {
    if (H && H.setJSON) { H.setJSON(KEY, cache); return; }
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* private mode */ }
  }

  function starsFor(levelId) { return data().stars[levelId] || 0; }
  function totalStars() {
    var t = 0;
    for (var k in data().stars) t += data().stars[k] || 0;
    return t;
  }
  function recordResult(levelId, stars, score) {
    var d = data();
    var improved = false;
    if (stars > (d.stars[levelId] || 0)) { d.stars[levelId] = stars; improved = true; }
    if (score > (d.best[levelId] || 0)) { d.best[levelId] = score; improved = true; }
    if (improved) save();
    return improved;
  }

  function bestFor(levelId) { return data().best[levelId] || 0; }

  function endlessBest() { return data().endless || 0; }
  function recordEndless(wave, score) {
    var d = data();
    if (score > d.endless) { d.endless = score; d.endlessWave = wave; save(); return true; }
    return false;
  }
  function endlessWave() { return data().endlessWave || 0; }

  function isUnlocked(levelIndex, levelId) {
    if (levelIndex <= 0) return true;
    /* Unlocked by clearing the previous level at least once, OR by earning 3
     * stars anywhere earlier — a child who got stuck should not be walled in. */
    if ((data().stars[levelId] || 0) > 0) return true;
    var prev = global.CCData.LEVELS[levelIndex - 1];
    if (prev && starsFor(prev.id) > 0) return true;
    return totalStars() >= 2;
  }

  function anyLevelCleared() {
    return Object.keys(data().stars).some(function (k) { return (data().stars[k] || 0) > 0; });
  }

  function unlockedEndless() { return anyLevelCleared(); }

  function isMuted() { return !!data().muted; }
  function setMuted(v) { data().muted = v ? 1 : 0; save(); }

  function markSeen(key) { data().seen[key] = 1; save(); }
  function seen(key) { return !!data().seen[key]; }

  function resetAll() {
    cache = { stars: {}, best: {}, endless: 0, muted: 0, seen: {} };
    save();
  }

  var CCSave = {
    starsFor: starsFor,
    totalStars: totalStars,
    bestFor: bestFor,
    recordResult: recordResult,
    endlessBest: endlessBest,
    endlessWave: endlessWave,
    recordEndless: recordEndless,
    isUnlocked: isUnlocked,
    unlockedEndless: unlockedEndless,
    isMuted: isMuted,
    setMuted: setMuted,
    markSeen: markSeen,
    seen: seen,
    resetAll: resetAll
  };

  global.CCSave = CCSave;
})(typeof window !== 'undefined' ? window : globalThis);
