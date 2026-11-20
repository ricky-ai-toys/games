/*! Amber's Trophies — a cross-game badge shelf.
 * localStorage key: amber_trophies_v1  ({ trophyId: earnedTimestamp })
 * Include on the portal (and any game that awards a trophy):
 *   <script src="trophies.js"></script>   (games in folders: ../trophies.js)
 * Games award milestones with AmberTrophies.award('farm_harvest').
 * The portal derives the generic badges from playtime/bests via syncDerived().
 */
(function (global) {
  'use strict';

  var KEY = 'amber_trophies_v1';

  var CATALOG = [
    { id: 'first_play',   icon: '🌱', title: 'First Steps',  desc: 'Play your very first game' },
    { id: 'first_best',   icon: '🏆', title: 'First Best',   desc: 'Set your first best score' },
    { id: 'explorer_5',   icon: '🧭', title: 'Explorer',     desc: 'Score in 5 different games' },
    { id: 'explorer_10',  icon: '🗺️', title: 'Trailblazer',  desc: 'Score in 10 different games' },
    { id: 'well_rounded', icon: '🎨', title: 'Well Rounded', desc: 'Score in a Play, a Learn and a Create game' },
    { id: 'streak_3',     icon: '🔥', title: 'On a Roll',    desc: 'Play 3 days in a row' },
    { id: 'farm_harvest', icon: '🌾', title: 'Green Thumb',  desc: 'Harvest 25 crops on the farm' },
    { id: 'word_10',      icon: '🌸', title: 'Word Sprout',  desc: 'Spell 10 words in Word Garden' },
    { id: 'word_50',      icon: '🌻', title: 'Word Bloom',   desc: 'Spell 50 words in Word Garden' },
    { id: 'fraction_chef', icon: '🍕', title: 'Fraction Chef', desc: 'Serve 20 perfect pizzas' },
    { id: 'solar_reader', icon: '📚', title: 'Star Reader',  desc: 'Visit every planet on Solar Tour' }
  ];

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '{}');
      return (d && typeof d === 'object') ? d : {};
    } catch (e) { return {}; }
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
  }
  function award(id) {
    var d = load();
    if (d[id]) return false;
    d[id] = Date.now();
    save(d);
    return true;
  }
  function earned() { return load(); }
  function isEarned(id) { return !!load()[id]; }

  /* Portal calls this with computed stats; returns ids newly earned. */
  function syncDerived(s) {
    var newly = [];
    function tryAward(id, cond) { if (cond && award(id)) newly.push(id); }
    tryAward('first_play', (s.totalPlayMs > 0) || (s.scoredCount > 0));
    tryAward('first_best', s.scoredCount > 0);
    tryAward('explorer_5', s.scoredCount >= 5);
    tryAward('explorer_10', s.scoredCount >= 10);
    tryAward('well_rounded', !!(s.groupsScored && s.groupsScored.play && s.groupsScored.learn && s.groupsScored.create));
    tryAward('streak_3', (s.streakDays || 0) >= 3);
    return newly;
  }

  global.AmberTrophies = {
    CATALOG: CATALOG, award: award, earned: earned,
    isEarned: isEarned, syncDerived: syncDerived
  };
})(typeof window !== 'undefined' ? window : globalThis);
