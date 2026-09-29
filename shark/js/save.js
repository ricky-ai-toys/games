/* Amber's Shark Hunt — save data.
 * Every read and write goes through AmberHardening, which wraps them in
 * try/catch. The old file had five unguarded localStorage reads, including one
 * in the boot path that threw under Safari private mode and replaced the menu
 * with the generic error overlay.
 *
 * Keys are unchanged from the old single-file game so existing records survive.
 * wild_best_shark_* is read once for migration and is no longer written.
 */
(function (global) {
  'use strict';

  var H = global.AmberHardening;
  var PREFIX = 'shark_';
  var LEGACY_PREFIX = 'wild_best_shark_';

  function getInt(key, dflt) {
    if (H && H.getInt) return H.getInt(key, dflt);
    try {
      var v = parseInt(localStorage.getItem(key), 10);
      return isFinite(v) ? v : dflt;
    } catch (e) { return dflt; }
  }

  function setInt(key, value) {
    if (H && H.setInt) return H.setInt(key, value);
    try { localStorage.setItem(key, String(value)); } catch (e) { /* private mode */ }
  }

  /* Best score for a difficulty, folded with the pre-split legacy key. */
  function best(lvl) {
    var now = getInt(PREFIX + 'best_' + lvl, 0) || 0;
    var legacy = getInt(LEGACY_PREFIX + lvl, 0) || 0;
    return Math.max(now, legacy);
  }

  function setBest(lvl, score) {
    if (score > getInt(PREFIX + 'best_' + lvl, 0)) setInt(PREFIX + 'best_' + lvl, score);
  }

  function bestSize(lvl) {
    return getInt(PREFIX + 'bestsize_' + lvl, 0) || 0;
  }

  function setBestSize(lvl, size) {
    if (size > bestSize(lvl)) setInt(PREFIX + 'bestsize_' + lvl, size);
  }

  function wins(lvl) {
    return getInt(PREFIX + 'wins_' + lvl, 0) || 0;
  }

  function addWin(lvl) {
    setInt(PREFIX + 'wins_' + lvl, wins(lvl) + 1);
  }

  function tutorialSeen() {
    /* The old file's tutorial flag was never migrated from wild_shark_tutorial,
     * so players who had already read it saw the help again here. */
    if (getInt(PREFIX + 'tutorial', 0)) return true;
    return !!getInt('wild_shark_tutorial', 0);
  }

  function markTutorialSeen() {
    setInt(PREFIX + 'tutorial', 1);
  }

  var SHSave = {
    best: best,
    setBest: setBest,
    bestSize: bestSize,
    setBestSize: setBestSize,
    wins: wins,
    addWin: addWin,
    tutorialSeen: tutorialSeen,
    markTutorialSeen: markTutorialSeen
  };

  global.SHSave = SHSave;
})(typeof window !== 'undefined' ? window : globalThis);
