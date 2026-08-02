/*! Amber playtime tracker — active seconds only (tab visible).
 * localStorage key: amber_playtime_v1
 * Include on portal + every game: <script src="playtime.js" defer></script>
 * Farm: <script src="../playtime.js" defer></script>
 */
(function (global) {
  'use strict';

  var KEY = 'amber_playtime_v1';
  var FLUSH_MS = 5000;
  var MAX_TICK_MS = 30000; // ignore long stalls (sleep / freeze)

  function todayKey(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function resolveGameId() {
    try {
      var path = (location.pathname || '').replace(/\\/g, '/');
      // strip trailing slash except root
      if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1);
      var parts = path.split('/').filter(Boolean);
      if (!parts.length) return 'portal';
      var last = parts[parts.length - 1];
      if (last === 'index.html' || last === 'portal.html' || last === '') {
        // farm/index.html → farm
        if (parts.length >= 2 && last === 'index.html') return parts[parts.length - 2];
        return 'portal';
      }
      // salon.html → salon
      if (/\.html?$/i.test(last)) return last.replace(/\.html?$/i, '');
      return last;
    } catch (e) {
      return 'unknown';
    }
  }

  function emptyState() {
    return {
      v: 1,
      totalMs: 0,
      byGame: {},
      days: {},
      sessions: 0,
      lastActive: 0,
      firstSeen: Date.now()
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return emptyState();
      if (typeof data.totalMs !== 'number') data.totalMs = 0;
      if (!data.byGame || typeof data.byGame !== 'object') data.byGame = {};
      if (!data.days || typeof data.days !== 'object') data.days = {};
      if (typeof data.sessions !== 'number') data.sessions = 0;
      return data;
    } catch (e) {
      return emptyState();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensureGame(data, id) {
    if (!data.byGame[id]) {
      data.byGame[id] = { ms: 0, sessions: 0, last: 0, title: id };
    }
    return data.byGame[id];
  }

  function formatDuration(ms) {
    ms = Math.max(0, Math.floor(ms || 0));
    var sec = Math.floor(ms / 1000);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  }

  function formatCompact(ms) {
    ms = Math.max(0, Math.floor(ms || 0));
    var sec = Math.floor(ms / 1000);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm';
    if (sec > 0) return sec + 's';
    return '0m';
  }

  var gameId = resolveGameId();
  var data = load();
  var active = false;
  var startedAt = 0;
  var flushTimer = null;
  var sessionCounted = false;

  function isVisible() {
    return document.visibilityState !== 'hidden';
  }

  function accrue() {
    if (!active || !startedAt) return 0;
    var now = Date.now();
    var delta = now - startedAt;
    startedAt = now;
    if (delta <= 0) return 0;
    if (delta > MAX_TICK_MS) delta = MAX_TICK_MS; // clamp sleep gaps
    data = load(); // merge if another tab wrote
    data.totalMs = (data.totalMs || 0) + delta;
    var g = ensureGame(data, gameId);
    g.ms = (g.ms || 0) + delta;
    g.last = now;
    data.lastActive = now;
    var day = todayKey();
    data.days[day] = (data.days[day] || 0) + delta;
    // prune old days (>90)
    var keys = Object.keys(data.days).sort();
    while (keys.length > 90) {
      delete data.days[keys.shift()];
    }
    save(data);
    return delta;
  }

  function startSession() {
    if (active) return;
    active = true;
    startedAt = Date.now();
    if (!sessionCounted) {
      sessionCounted = true;
      data = load();
      data.sessions = (data.sessions || 0) + 1;
      var g = ensureGame(data, gameId);
      g.sessions = (g.sessions || 0) + 1;
      g.last = Date.now();
      if (!data.firstSeen) data.firstSeen = Date.now();
      save(data);
    }
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = setInterval(function () {
      if (active && isVisible()) accrue();
    }, FLUSH_MS);
  }

  function stopSession() {
    if (!active) return;
    accrue();
    active = false;
    startedAt = 0;
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }

  function onVis() {
    if (isVisible()) startSession();
    else stopSession();
  }

  function getSnapshot() {
    // include unflushed active slice without mutating permanently until save
    var snap = load();
    if (active && startedAt) {
      var extra = Math.min(MAX_TICK_MS, Math.max(0, Date.now() - startedAt));
      snap.totalMs = (snap.totalMs || 0) + extra;
      var g = ensureGame(snap, gameId);
      g.ms = (g.ms || 0) + extra;
      var day = todayKey();
      snap.days[day] = (snap.days[day] || 0) + extra;
    }
    return snap;
  }

  function getTodayMs() {
    var snap = getSnapshot();
    return snap.days[todayKey()] || 0;
  }

  function getGameMs(id) {
    var snap = getSnapshot();
    id = id || gameId;
    return (snap.byGame[id] && snap.byGame[id].ms) || 0;
  }

  function getRankedGames() {
    var snap = getSnapshot();
    return Object.keys(snap.byGame)
      .map(function (id) {
        var g = snap.byGame[id];
        return { id: id, ms: g.ms || 0, sessions: g.sessions || 0, last: g.last || 0 };
      })
      .sort(function (a, b) { return b.ms - a.ms; });
  }

  function setGameTitle(title) {
    try {
      data = load();
      var g = ensureGame(data, gameId);
      g.title = title;
      save(data);
    } catch (e) {}
  }

  // boot — start immediately so first paint can already see a session
  if (typeof document !== 'undefined') {
    try { onVis(); } catch (e0) {}
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', stopSession);
    window.addEventListener('beforeunload', stopSession);
    window.addEventListener('freeze', stopSession);
    window.addEventListener('resume', onVis);
  }

  var api = {
    key: KEY,
    gameId: gameId,
    format: formatDuration,
    formatCompact: formatCompact,
    getSnapshot: getSnapshot,
    getTodayMs: getTodayMs,
    getGameMs: getGameMs,
    getRankedGames: getRankedGames,
    setGameTitle: setGameTitle,
    flush: accrue,
    todayKey: todayKey
  };

  global.AmberPlaytime = api;
})(typeof window !== 'undefined' ? window : this);
