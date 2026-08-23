/* Amber's Games — shared hardening helpers
 * Loaded by every game via <script src="../hardening.js"></script>
 * Exposes window.AmberHardening — defensive, never throws, opt-in.
 */
(function (global) {
  'use strict';

  var H = {};

  // ---------- Safe localStorage ----------

  H.getJSON = function (key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };

  H.setJSON = function (key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  };

  H.getString = function (key, fallback) {
    try {
      var v = global.localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  };

  H.setInt = function (key, value) {
    return H.setString(key, String(value));
  };

  H.getInt = function (key, fallback) {
    var raw = H.getString(key, null);
    if (raw == null) return fallback;
    var n = parseInt(raw, 10);
    return isNaN(n) ? fallback : n;
  };

  H.setString = function (key, value) {
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  };

  H.remove = function (key) {
    try { global.localStorage.removeItem(key); } catch (e) {}
  };

  H.clearScope = function (prefix) {
    try {
      var keys = [];
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) keys.push(k);
      }
      for (var j = 0; j < keys.length; j++) {
        global.localStorage.removeItem(keys[j]);
      }
    } catch (e) {}
  };

  // ---------- Friendly error overlay ----------

  H.installErrorOverlay = function (message) {
    if (global.__amberErrorInstalled) return;
    global.__amberErrorInstalled = true;

    function show(err) {
      try {
        var div = global.document.createElement('div');
        div.setAttribute('role', 'alert');
        div.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#1a1a2e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;text-align:center;';
        var msg = message || "Something went wrong. Let's restart!";
        div.innerHTML = '<div style="font-size:48px;margin-bottom:16px">🦊</div>' +
          '<div style="font-size:18px;margin-bottom:24px">' + msg + '</div>' +
          '<button id="__amberReload" style="font-size:16px;padding:12px 24px;border:none;border-radius:8px;background:#f5a623;color:#1a1a2e;cursor:pointer;font-weight:bold;">Reload</button>';
        global.document.body.appendChild(div);
        var btn = global.document.getElementById('__amberReload');
        if (btn) btn.onclick = function () { global.location.reload(); };
      } catch (e) {}
    }

    global.addEventListener('error', function (e) {
      if (e && e.__amberHandled) return;
      if (e) e.__amberHandled = true;
      show(e && e.message);
    });

    global.addEventListener('unhandledrejection', function (e) {
      if (e && e.__amberHandled) return;
      if (e) e.__amberHandled = true;
    });
  };

  // ---------- Audio ----------

  H.safeResume = function (ctx) {
    try {
      if (ctx && typeof ctx.resume === 'function') {
        var p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
    } catch (e) {}
  };

  H.installAudioGestureUnlock = function () {
    if (global.__amberAudioUnlockInstalled) return;
    global.__amberAudioUnlockInstalled = true;
    function unlock() {
      try {
        var ac = global.__amberAudioCtx || (global.AudioContext && new global.AudioContext());
        if (!global.__amberAudioCtx) global.__amberAudioCtx = ac;
        H.safeResume(ac);
      } catch (e) {}
    }
    global.addEventListener('pointerdown', unlock, { once: true });
    global.addEventListener('keydown', unlock, { once: true });
    global.addEventListener('touchstart', unlock, { once: true });
  };

  // ---------- Visibility ----------

  H.onVisible = function (cb) {
    global.addEventListener('visibilitychange', function () {
      if (!global.document.hidden) cb();
    });
  };

  H.onHidden = function (cb) {
    global.addEventListener('visibilitychange', function () {
      if (global.document.hidden) cb();
    });
  };

  global.AmberHardening = H;
})(window);
